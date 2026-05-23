package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

func TriggerInternalDelivery(saleID string) error {
	log.Printf("[Debug] TriggerInternalDelivery acionado para saleID: %s", saleID)

	port := os.Getenv("NESTJS_PORT")
	if port == "" {
		port = "3001"
	}

	url := fmt.Sprintf("http://localhost:%s/api/webhook/internal-deliver", port)
	
	reqBody, err := json.Marshal(map[string]string{
		"saleId": saleID,
	})
	if err != nil {
		log.Printf("[Debug] Erro ao serializar saleID para JSON: %v", err)
		return err
	}

	internalSecret := os.Getenv("INTERNAL_SECRET")
	if internalSecret == "" {
		log.Printf("[Debug] Erro: INTERNAL_SECRET nao configurada. Entrega nao pode ser acionada.")
		return fmt.Errorf("INTERNAL_SECRET nao configurada")
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("[Debug] Erro ao criar requisicao HTTP de entrega: %v", err)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", internalSecret)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	log.Printf("[Debug] Enviando POST para o NestJS na URL: %s", url)
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Debug] Erro ao realizar chamada HTTP para o NestJS: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[Debug] NestJS retornou erro HTTP %d na entrega. Resposta: %s", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("falha ao acionar entrega no NestJS status %d", resp.StatusCode)
	}

	log.Printf("[Debug] Entrega acionada com sucesso no NestJS para saleID: %s", saleID)
	return nil
}
