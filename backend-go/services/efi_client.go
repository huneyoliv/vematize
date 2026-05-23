package services

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type EfiTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type EfiPixDetailResponse struct {
	Status string `json:"status"`
}

func getMTLSClient(certBase64 string) (*http.Client, error) {
	log.Println("[Debug] Decodificando certificado Efí do Base64")
	
	certBytes, err := base64.StdEncoding.DecodeString(certBase64)
	if err != nil {
		log.Printf("[Debug] Falha ao decodificar certificado em base64: %v. Tentando utilizar formato PEM puro.", err)
		certBytes = []byte(certBase64)
	}

	cert, err := tls.X509KeyPair(certBytes, certBytes)
	if err != nil {
		log.Printf("[Debug] Erro ao carregar par de chaves X509: %v", err)
		return nil, err
	}

	tlsConfig := &tls.Config{
		Certificates:       []tls.Certificate{cert},
		InsecureSkipVerify: false,
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
	}

	return client, nil
}

func GetPixStatus(clientID, clientSecret, certBase64 string, isProd bool, txid string) (string, error) {
	log.Printf("[Debug] GetPixStatus acionado para txid: %s", txid)

	if clientID == "" || clientSecret == "" {
		log.Println("[Debug] Erro: clientID ou clientSecret da Efí vazios")
		return "", errors.New("credenciais vazias")
	}

	if certBase64 == "" {
		log.Println("[Debug] Erro: certificado da Efí vazio")
		return "", errors.New("certificado vazio")
	}

	client, err := getMTLSClient(certBase64)
	if err != nil {
		return "", err
	}

	baseURL := "https://api-pix-h.efi.com.br"
	if isProd {
		baseURL = "https://api-pix.efi.com.br"
	}

	log.Println("[Debug] Obtendo access token OAuth da Efí")
	tokenURL := fmt.Sprintf("%s/v2/oauth/token", baseURL)
	
	reqBody := []byte(`{"grant_type": "client_credentials"}`)
	req, err := http.NewRequest("POST", tokenURL, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("[Debug] Erro ao criar request OAuth Efí: %v", err)
		return "", err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", clientID, clientSecret)))
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", auth))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Debug] Erro ao executar chamada OAuth Efí: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[Debug] Efí OAuth retornou status %d. Detalhes: %s", resp.StatusCode, string(bodyBytes))
		return "", fmt.Errorf("oauth falhou com status %d", resp.StatusCode)
	}

	var tokenResp EfiTokenResponse
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Debug] Erro ao ler resposta do OAuth: %v", err)
		return "", err
	}

	if err := json.Unmarshal(bodyBytes, &tokenResp); err != nil {
		log.Printf("[Debug] Erro ao decodificar JSON do OAuth: %v", err)
		return "", err
	}

	log.Println("[Debug] Efí OAuth autenticado com sucesso")

	log.Printf("[Debug] Consultando cobranca Pix txid %s na Efí", txid)
	cobURL := fmt.Sprintf("%s/v2/cob/%s", baseURL, txid)
	
	reqCob, err := http.NewRequest("GET", cobURL, nil)
	if err != nil {
		log.Printf("[Debug] Erro ao criar request de cobranca: %v", err)
		return "", err
	}

	reqCob.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenResp.AccessToken))
	reqCob.Header.Set("Content-Type", "application/json")

	respCob, err := client.Do(reqCob)
	if err != nil {
		log.Printf("[Debug] Erro ao executar requisicao GET de cobranca: %v", err)
		return "", err
	}
	defer respCob.Body.Close()

	if respCob.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(respCob.Body)
		log.Printf("[Debug] Consulta cobranca Efí retornou status %d. Detalhes: %s", respCob.StatusCode, string(bodyBytes))
		return "", fmt.Errorf("consulta cobranca falhou com status %d", respCob.StatusCode)
	}

	bodyBytesCob, err := io.ReadAll(respCob.Body)
	if err != nil {
		log.Printf("[Debug] Erro ao ler resposta da cobranca: %v", err)
		return "", err
	}

	var cobResp EfiPixDetailResponse
	if err := json.Unmarshal(bodyBytesCob, &cobResp); err != nil {
		log.Printf("[Debug] Erro ao decodificar JSON da cobranca: %v", err)
		return "", err
	}

	log.Printf("[Debug] Efí retornou Status da cobranca: %s para txid: %s", cobResp.Status, txid)
	return cobResp.Status, nil
}
