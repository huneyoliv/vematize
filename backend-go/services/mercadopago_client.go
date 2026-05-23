package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type MPPaymentResponse struct {
	ID     int64  `json:"id"`
	Status string `json:"status"`
}

func GetPaymentStatus(accessToken string, paymentID string) (string, error) {
	log.Printf("[Debug] GetPaymentStatus acionado para o paymentID: %s", paymentID)
	
	if accessToken == "" {
		log.Println("[Debug] Erro: access token do MercadoPago vazio")
		return "", errors.New("access token vazio")
	}

	url := fmt.Sprintf("https://api.mercadopago.com/v1/payments/%s", paymentID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("[Debug] Erro ao criar request MercadoPago: %v", err)
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	log.Println("[Debug] Enviando requisicao HTTP GET ao MercadoPago")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Debug] Erro ao executar requisicao MercadoPago: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[Debug] MercadoPago retornou HTTP %d. Resposta: %s", resp.StatusCode, string(bodyBytes))
		return "", fmt.Errorf("erro na API do MercadoPago status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Debug] Erro ao ler resposta do MercadoPago: %v", err)
		return "", err
	}

	var mpResp MPPaymentResponse
	if err := json.Unmarshal(bodyBytes, &mpResp); err != nil {
		log.Printf("[Debug] Erro ao decodificar JSON do MercadoPago: %v", err)
		return "", err
	}

	log.Printf("[Debug] MercadoPago retornou Status: %s para o paymentID: %s", mpResp.Status, paymentID)
	return mpResp.Status, nil
}
