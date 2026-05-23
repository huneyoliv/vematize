package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleMercadoPagoInvalidBody(t *testing.T) {
	log.Println("[Debug] Testando HandleMercadoPago com corpo invalido")
	
	req, err := http.NewRequest("POST", "/api/webhook/mercadopago", nil)
	if err != nil {
		t.Fatalf("Erro ao criar request: %v", err)
	}

	rr := httptest.NewRecorder()
	handler := HandleMercadoPago(nil)

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusInternalServerError && rr.Code != http.StatusBadRequest {
		t.Errorf("Esperava falha HTTP, mas obteve %d", rr.Code)
	}
}

func TestHandleEfiInvalidBody(t *testing.T) {
	log.Println("[Debug] Testando HandleEfi com corpo invalido")
	
	req, err := http.NewRequest("POST", "/api/webhook/efi", bytes.NewBuffer([]byte(`{invalid-json`)))
	if err != nil {
		t.Fatalf("Erro ao criar request: %v", err)
	}

	rr := httptest.NewRecorder()
	handler := HandleEfi(nil)

	handler.ServeHTTP(rr, req)

	if rr.Code == http.StatusOK {
		t.Error("Esperava erro HTTP, mas obteve 200 OK")
	}
}

func TestHandleEfiInvalidTLSHeader(t *testing.T) {
	log.Println("[Debug] Testando HandleEfi com header TLS FAILED")

	body := map[string]interface{}{
		"pix": []interface{}{
			map[string]string{"txid": "test-txid"},
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", "/api/webhook/efi", bytes.NewBuffer(bodyBytes))
	if err != nil {
		t.Fatalf("Erro ao criar request: %v", err)
	}

	req.Header.Set("x-ssl-client-verify", "FAILED")

	rr := httptest.NewRecorder()
	handler := HandleEfi(nil)

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Esperava 500 Internal Server Error, mas obteve %d", rr.Code)
	}
}
