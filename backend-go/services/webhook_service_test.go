package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"testing"

	"vematize-backend-go/crypto"
	"vematize-backend-go/db"
)

func TestValidateMPSignature(t *testing.T) {
	secret := "minha-chave-secreta-mp-123"
	xRequestId := "req-999"
	dataID := "12345678"
	ts := "1700000000"

	manifest := fmt.Sprintf("id:%s;request-id:%s;ts:%s;", dataID, xRequestId, ts)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(manifest))
	v1 := hex.EncodeToString(mac.Sum(nil))

	xSignature := fmt.Sprintf("ts=%s,v1=%s", ts, v1)

	log.Println("[Debug] Testando validacao de assinatura MercadoPago valida")
	if !ValidateMPSignature(secret, xSignature, xRequestId, dataID) {
		t.Error("Esperava que a assinatura do MercadoPago fosse valida, mas retornou invalida")
	}

	log.Println("[Debug] Testando validacao de assinatura MercadoPago invalida (alterada)")
	xSignatureInvalida := fmt.Sprintf("ts=%s,v1=hashadulterado", ts)
	if ValidateMPSignature(secret, xSignatureInvalida, xRequestId, dataID) {
		t.Error("Esperava que a assinatura alterada fosse rejeitada, mas retornou valida")
	}

	log.Println("[Debug] Testando com campos vazios")
	if ValidateMPSignature("", xSignature, xRequestId, dataID) {
		t.Error("Esperava falha ao validar com chave secreta vazia")
	}
}

func TestEfiVerifyHeader(t *testing.T) {
	headersValidos := map[string]string{
		"x-ssl-client-verify": "SUCCESS",
	}

	log.Println("[Debug] Testando validacao de header mTLS da Efi valido")
	clientVerify := headersValidos["x-ssl-client-verify"]
	if clientVerify != "SUCCESS" {
		t.Errorf("Esperava SUCCESS, mas obteve: %s", clientVerify)
	}

	headersInvalidos := map[string]string{
		"x-ssl-client-verify": "FAILED",
	}

	log.Println("[Debug] Testando validacao de header mTLS da Efi invalido")
	clientVerify = headersInvalidos["x-ssl-client-verify"]
	if clientVerify == "SUCCESS" {
		t.Error("Esperava rejeicao de mTLS com status FAILED")
	}
}

func TestProcessMercadoPagoSignatureOptional(t *testing.T) {
	var bodyBytes = []byte(`{"id": 123, "type": "payment"}`)
	var headers = map[string]string{}
	var queryParams = map[string]string{}

	err := ProcessMercadoPago(nil, bodyBytes, headers, queryParams)
	if err == nil {
		t.Error("Esperava erro devido ao pool de banco nulo, mas obteve nil")
	}

	if err.Error() == "assinatura do webhook ausente" {
		t.Error("Nao deveria falhar por assinatura ausente, mas falhou")
	}
}

func TestProcessMercadoPagoWithIDQueryParam(t *testing.T) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgresql://vematize:BiM7myy1j629Th@127.0.0.1:5432/vematize"
	}

	pool, err := db.InitDB(connStr)
	if err != nil {
		t.Skip("Postgres indisponivel para teste integrado de webhook")
		return
	}
	defer pool.Close()

	ctx := context.Background()
	settingsID := "test-settings-webhook-go"
	saleID := "test-sale-webhook-go"

	pool.Exec(ctx, "DELETE FROM sales WHERE id = $1", saleID)
	pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", settingsID)

	os.Setenv("ENCRYPTION_KEY", "chave-secreta-de-teste-longa-32-bytes")
	defer os.Unsetenv("ENCRYPTION_KEY")

	secret := "webhook-secret-12345"
	encryptedSecret, err := crypto.Encrypt(secret)
	if err != nil {
		t.Fatalf("Erro ao criptografar segredo: %v", err)
	}

	mpConfig := map[string]interface{}{
		"webhook_secret":         encryptedSecret,
		"production_access_token": "some-dummy-access-token-1234",
	}
	mpConfigBytes, _ := json.Marshal(mpConfig)

	insertSettingsQuery := `
		INSERT INTO settings (
			id, "logoUrl", "preferredPixGateway", "preferredCardGateway", "activeGateway",
			"mercadopagoConfig", "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err = pool.Exec(ctx, insertSettingsQuery,
		settingsID, "http://logo.com", "efi", "mercadopago", "mercadopago", mpConfigBytes,
	)
	if err != nil {
		t.Fatalf("Erro ao inserir settings de teste: %v", err)
	}

	paymentDetails := map[string]interface{}{
		"paymentId": "999888777",
	}
	paymentDetailsBytes, _ := json.Marshal(paymentDetails)

	insertSaleQuery := `
		INSERT INTO sales (
			id, "productId", "userId", quantity, "totalPrice", status, "paymentGateway",
			"webhookVerified", "providerVerified", "paymentDetails", "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
	`
	_, err = pool.Exec(ctx, insertSaleQuery,
		saleID, "test-product-go", "test-user-go", 1, 100.0, "pending", "mercadopago",
		false, false, paymentDetailsBytes,
	)
	if err != nil {
		t.Fatalf("Erro ao inserir venda de teste: %v", err)
	}

	defer func() {
		pool.Exec(ctx, "DELETE FROM sales WHERE id = $1", saleID)
		pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", settingsID)
	}()

	dataID := "999888777"
	xRequestId := "req-abc-123"
	ts := "1700000000"
	manifest := fmt.Sprintf("id:%s;request-id:%s;ts:%s;", dataID, xRequestId, ts)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(manifest))
	v1 := hex.EncodeToString(mac.Sum(nil))
	xSignature := fmt.Sprintf("ts=%s,v1=%s", ts, v1)

	headers := map[string]string{
		"x-signature":  xSignature,
		"x-request-id": xRequestId,
	}

	queryParams := map[string]string{
		"id":    dataID,
		"topic": "payment",
	}

	err = ProcessMercadoPago(pool, []byte("{}"), headers, queryParams)
	if err == nil {
		t.Fatal("Esperava erro da API do MercadoPago com token de mentira, mas retornou nil")
	}

	if !strings.Contains(err.Error(), "erro na API do MercadoPago") {
		t.Errorf("Esperava erro de API do MercadoPago, mas obteve: %v", err)
	}
}

func TestProcessMercadoPagoWithIPNSignatureSkip(t *testing.T) {
	var bodyBytes = []byte("{}")
	var headers = map[string]string{
		"x-signature":  "ts=1700000000,v1=assinatura-falsa-invalida",
		"x-request-id": "req-999",
	}
	var queryParams = map[string]string{
		"id":    "123456",
		"topic": "payment",
	}

	err := ProcessMercadoPago(nil, bodyBytes, headers, queryParams)
	if err == nil {
		t.Fatal("Esperava erro, mas obteve nil")
	}

	if err.Error() == "assinatura do webhook invalida" {
		t.Error("Nao deveria falhar por assinatura invalida, pois e um IPN que pula a assinatura")
	}

	if err.Error() != "pool de banco de dados nulo" {
		t.Errorf("Esperava erro de pool de banco nulo, mas obteve: %v", err)
	}
}
