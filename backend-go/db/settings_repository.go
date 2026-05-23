package db

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"vematize-backend-go/crypto"
)

var mpSensitiveFields = []string{"production_access_token", "webhook_secret"}
var efiSensitiveFields = []string{
	"production_client_id",
	"production_client_secret",
	"sandbox_client_id",
	"sandbox_client_secret",
	"production_certificate_base64",
	"sandbox_certificate_base64",
	"certificate",
}

func decryptConfigMap(config map[string]interface{}, fields []string) map[string]interface{} {
	if config == nil {
		return nil
	}
	decrypted := make(map[string]interface{})
	for k, v := range config {
		decrypted[k] = v
	}
	for _, field := range fields {
		if val, exists := decrypted[field]; exists {
			if strVal, ok := val.(string); ok && strVal != "" {
				decryptedVal, err := crypto.Decrypt(strVal)
				if err == nil {
					decrypted[field] = decryptedVal
				} else {
					log.Printf("[Debug] Falha ao descriptografar campo %s: %v", field, err)
				}
			}
		}
	}
	return decrypted
}

func GetDecryptedSettings(pool *pgxpool.Pool) (*Settings, error) {
	log.Println("[Debug] Buscando configuracoes no settings do banco")
	query := `
		SELECT 
			id, "logoUrl", "preferredPixGateway", "preferredCardGateway", "activeGateway",
			"mercadopagoConfig", "efiConfig", "pushinpayConfig", "createdAt", "updatedAt"
		FROM settings
		LIMIT 1
	`

	var settings Settings
	var mpBytes, efiBytes, pushinpayBytes []byte
	ctx := context.Background()

	err := pool.QueryRow(ctx, query).Scan(
		&settings.ID, &settings.LogoURL, &settings.PreferredPixGateway, &settings.PreferredCardGateway,
		&settings.ActiveGateway, &mpBytes, &efiBytes, &pushinpayBytes, &settings.CreatedAt, &settings.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Println("[Debug] Nenhuma configuracao encontrada no banco")
			return nil, nil
		}
		log.Printf("[Debug] Erro ao buscar settings no banco: %v", err)
		return nil, err
	}

	if len(mpBytes) > 0 {
		if err := json.Unmarshal(mpBytes, &settings.MercadoPagoConfig); err != nil {
			log.Printf("[Debug] Erro ao decodificar mercadopagoConfig: %v", err)
			return nil, err
		}
	}

	if len(efiBytes) > 0 {
		if err := json.Unmarshal(efiBytes, &settings.EfiConfig); err != nil {
			log.Printf("[Debug] Erro ao decodificar efiConfig: %v", err)
			return nil, err
		}
	}

	if len(pushinpayBytes) > 0 {
		if err := json.Unmarshal(pushinpayBytes, &settings.PushinpayConfig); err != nil {
			log.Printf("[Debug] Erro ao decodificar pushinpayConfig: %v", err)
			return nil, err
		}
	}

	settings.MercadoPagoConfig = decryptConfigMap(settings.MercadoPagoConfig, mpSensitiveFields)
	settings.EfiConfig = decryptConfigMap(settings.EfiConfig, efiSensitiveFields)

	log.Println("[Debug] Configuracoes buscadas e descriptografadas com sucesso")
	return &settings, nil
}
