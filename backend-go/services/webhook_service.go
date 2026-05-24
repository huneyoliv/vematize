package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"vematize-backend-go/db"
)

type MPWebhookBody struct {
	ID    interface{}        `json:"id"`
	Type  string             `json:"type"`
	Topic string             `json:"topic"`
	Data  *MPWebhookBodyData `json:"data"`
}

type MPWebhookBodyData struct {
	ID string `json:"id"`
}

type EfiWebhookBody struct {
	Pix []EfiWebhookPixItem `json:"pix"`
}

type EfiWebhookPixItem struct {
	Txid string `json:"txid"`
}

func ValidateMPSignature(secret string, xSignature, xRequestId, dataID string) bool {
	log.Printf("[Debug] ValidateMPSignature acionado. xRequestId: %s, dataID: %s", xRequestId, dataID)

	if secret == "" || xSignature == "" || xRequestId == "" || dataID == "" {
		log.Println("[Debug] Elementos vazios para validacao de assinatura do MercadoPago")
		return false
	}

	parts := strings.Split(xSignature, ",")
	var ts string
	var v1 string
	for _, part := range parts {
		subParts := strings.Split(part, "=")
		if len(subParts) != 2 {
			continue
		}
		k := strings.TrimSpace(subParts[0])
		v := strings.TrimSpace(subParts[1])
		if k == "ts" {
			ts = v
		} else if k == "v1" {
			v1 = v
		}
	}

	if ts == "" || v1 == "" {
		log.Println("[Debug] Assinatura sem ts ou v1")
		return false
	}

	manifest := fmt.Sprintf("id:%s;request-id:%s;ts:%s;", dataID, xRequestId, ts)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(manifest))
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	valid := hmac.Equal([]byte(expectedHash), []byte(v1))
	log.Printf("[Debug] Validacao de assinatura concluida. Resultado: %t", valid)
	return valid
}

func ProcessMercadoPago(pool *pgxpool.Pool, bodyBytes []byte, headers map[string]string, queryParams map[string]string) error {
	log.Println("[Debug] ProcessMercadoPago acionado no Go")

	if pool == nil {
		log.Println("[Debug] Erro: Pool de banco de dados nulo no ProcessMercadoPago")
		return errors.New("pool de banco de dados nulo")
	}

	var body MPWebhookBody
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		log.Printf("[Debug] Erro ao decodificar payload do webhook MP: %v", err)
		return err
	}

	xSignature := headers["x-signature"]
	xRequestId := headers["x-request-id"]

	var dataID string
	if body.Data != nil && body.Data.ID != "" {
		dataID = body.Data.ID
	} else if body.ID != nil {
		dataID = fmt.Sprintf("%v", body.ID)
	} else if queryID, exists := queryParams["data.id"]; exists {
		dataID = queryID
	} else if queryID, exists := queryParams["id"]; exists {
		dataID = queryID
	}

	settings, err := db.GetDecryptedSettings(pool)
	if err != nil {
		log.Printf("[Debug] Erro ao obter settings para assinatura MP: %v", err)
		return err
	}

	var secret string
	if settings != nil {
		if secVal, exists := settings.MercadoPagoConfig["webhook_secret"]; exists {
			secret, _ = secVal.(string)
		}
	}

	isIPN := queryParams["topic"] != "" || body.Topic != ""
	if secret != "" && xSignature != "" && xRequestId != "" && !isIPN {
		if dataID == "" {
			return errors.New("id de pagamento ausente na assinatura")
		}

		if !ValidateMPSignature(secret, xSignature, xRequestId, dataID) {
			return errors.New("assinatura do webhook invalida")
		}
	}

	if body.Type != "payment" && body.Topic != "payment" {
		if body.Data == nil || body.Data.ID == "" {
			log.Println("[Debug] Ignorando evento que nao e de pagamento")
			return nil
		}
	}

	paymentID := dataID
	if paymentID == "" {
		log.Println("[Debug] Sem ID de pagamento no payload do webhook")
		return nil
	}

	log.Printf("[Debug] Buscando venda no banco para paymentID: %s", paymentID)
	sale, err := db.FindByPaymentID(pool, paymentID)
	if err != nil {
		return err
	}

	if sale == nil {
		log.Printf("[Debug] Venda nao encontrada por paymentID. Buscando por external reference (ID): %s", paymentID)
		sale, err = db.FindByID(pool, paymentID)
		if err != nil {
			return err
		}
	}

	if sale == nil {
		log.Printf("[Debug] Erro: Venda nao encontrada no sistema para o paymentID: %s", paymentID)
		return fmt.Errorf("venda nao encontrada no sistema: %s", paymentID)
	}

	settings, err = db.GetDecryptedSettings(pool)
	if err != nil {
		log.Printf("[Debug] Erro ao obter settings para API MP: %v", err)
		return err
	}

	var accessToken string
	if settings != nil {
		if tokVal, exists := settings.MercadoPagoConfig["production_access_token"]; exists {
			accessToken, _ = tokVal.(string)
		}
	}

	if accessToken == "" {
		log.Println("[Debug] Erro: access token do MercadoPago nao configurado")
		return errors.New("access token nao configurado")
	}

	log.Printf("[Debug] Chamando API do MercadoPago para buscar status real do pagamento: %s", paymentID)
	mpStatus, err := GetPaymentStatus(accessToken, paymentID)
	if err != nil {
		return err
	}

	newStatus := "pending"
	if mpStatus == "approved" {
		newStatus = "approved"
	} else if mpStatus == "rejected" || mpStatus == "cancelled" {
		newStatus = "failed"
	}

	if sale.Status != newStatus {
		if sale.PaymentDetails == nil {
			sale.PaymentDetails = make(map[string]interface{})
		}
		sale.PaymentDetails["paymentId"] = paymentID
		sale.PaymentDetails["status"] = mpStatus

		log.Printf("[Debug] Atualizando venda no banco para o novo status: %s", newStatus)
		err = db.UpdateSaleStatus(pool, sale.ID, newStatus, sale.PaymentDetails)
		if err != nil {
			return err
		}

		if newStatus == "approved" {
			log.Println("[Debug] Pagamento aprovado! Acionando entrega automatica de produtos.")
			_ = TriggerInternalDelivery(sale.ID)
		} else if newStatus == "failed" {
			log.Println("[Debug] Pagamento falhou! Liberando estoque do produto.")
			_ = db.ReleaseStock(pool, sale.ProductID, sale.Quantity)
		}
	}

	return nil
}

func ProcessEfi(pool *pgxpool.Pool, bodyBytes []byte, headers map[string]string) error {
	log.Println("[Debug] ProcessEfi acionado no Go")

	if pool == nil {
		log.Println("[Debug] Erro: Pool de banco de dados nulo no ProcessEfi")
		return errors.New("pool de banco de dados nulo")
	}

	clientVerify := headers["x-ssl-client-verify"]
	if clientVerify == "" {
		clientVerify = headers["ssl-client-verify"]
	}

	if clientVerify != "" && clientVerify != "SUCCESS" {
		log.Printf("[Debug] Falha na validacao mTLS da Efi no proxy reverso: %s", clientVerify)
		return errors.New("falha na validacao mtls da Efi")
	}

	var body EfiWebhookBody
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		log.Printf("[Debug] Erro ao decodificar webhook Efi: %v", err)
		return err
	}

	if len(body.Pix) == 0 {
		log.Println("[Debug] Sem itens de Pix no payload do webhook")
		return nil
	}

	settings, err := db.GetDecryptedSettings(pool)
	if err != nil {
		log.Printf("[Debug] Erro ao carregar settings para validar Pix: %v", err)
		return err
	}

	if settings == nil {
		return errors.New("configuracoes da Efi nao localizadas no banco")
	}

	var clientID, clientSecret, certBase64 string
	isProd := false
	if settings.EfiConfig != nil {
		if modeVal, exists := settings.EfiConfig["mode"]; exists {
			isProd = modeVal.(string) == "production"
		}
		if isProd {
			if cidVal, exists := settings.EfiConfig["production_client_id"]; exists {
				clientID, _ = cidVal.(string)
			}
			if csecVal, exists := settings.EfiConfig["production_client_secret"]; exists {
				clientSecret, _ = csecVal.(string)
			}
		} else {
			if cidVal, exists := settings.EfiConfig["sandbox_client_id"]; exists {
				clientID, _ = cidVal.(string)
			}
			if csecVal, exists := settings.EfiConfig["sandbox_client_secret"]; exists {
				clientSecret, _ = csecVal.(string)
			}
		}

		if certVal, exists := settings.EfiConfig["certificate"]; exists {
			certBase64, _ = certVal.(string)
		} else if certVal, exists := settings.EfiConfig["production_certificate_base64"]; exists {
			certBase64, _ = certVal.(string)
		}
	}

	for _, pixItem := range body.Pix {
		txid := pixItem.Txid
		if txid == "" {
			continue
		}

		log.Printf("[Debug] Processando Pix txid: %s", txid)
		sale, err := db.FindByTxid(pool, txid)
		if err != nil {
			log.Printf("[Debug] Erro ao buscar venda por txid %s: %v", txid, err)
			continue
		}

		if sale == nil {
			log.Printf("[Debug] Venda nao encontrada para txid: %s", txid)
			continue
		}

		if sale.Status == "approved" {
			log.Printf("[Debug] Venda txid %s ja esta aprovada. Ignorando.", txid)
			continue
		}

		log.Printf("[Debug] Consultando status real do Pix txid %s na API da Efí", txid)
		efiStatus, err := GetPixStatus(clientID, clientSecret, certBase64, isProd, txid)
		if err != nil {
			log.Printf("[Debug] Erro ao consultar Pix na Efi para txid %s: %v", txid, err)
			continue
		}

		if efiStatus == "CONCLUIDA" && sale.Status != "approved" {
			if sale.PaymentDetails == nil {
				sale.PaymentDetails = make(map[string]interface{})
			}
			sale.PaymentDetails["status"] = "CONCLUIDA"

			log.Printf("[Debug] Pagamento Pix aprovado! Atualizando status no banco para a venda: %s", sale.ID)
			err = db.UpdateSaleStatus(pool, sale.ID, "approved", sale.PaymentDetails)
			if err != nil {
				log.Printf("[Debug] Erro ao atualizar status da venda %s: %v", sale.ID, err)
				continue
			}

			log.Println("[Debug] Pix aprovado com sucesso! Acionando entrega automatica de produtos.")
			_ = TriggerInternalDelivery(sale.ID)
		}
	}

	return nil
}
