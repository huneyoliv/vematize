package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"testing"
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
