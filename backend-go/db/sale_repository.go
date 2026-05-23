package db

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func FindByPaymentID(pool *pgxpool.Pool, paymentID string) (*Sale, error) {
	log.Printf("[Debug] Executando FindByPaymentID para paymentID: %s", paymentID)
	query := `
		SELECT 
			id, "productId", "userId", "telegramChatId", "telegramMessageId",
			"discordChannelId", "discordMessageId", "discordThreadId", quantity,
			"totalPrice", "couponCode", status, "paymentGateway", "webhookVerified",
			"providerVerified", "paymentDetails", "createdAt", "updatedAt"
		FROM sales
		WHERE "paymentGateway" = $1 AND "paymentDetails"->>'paymentId' = $2
		LIMIT 1
	`

	var sale Sale
	var paymentDetailsBytes []byte
	ctx := context.Background()

	err := pool.QueryRow(ctx, query, "mercadopago", paymentID).Scan(
		&sale.ID, &sale.ProductID, &sale.UserID, &sale.TelegramChatID, &sale.TelegramMessageID,
		&sale.DiscordChannelID, &sale.DiscordMessageID, &sale.DiscordThreadID, &sale.Quantity,
		&sale.TotalPrice, &sale.CouponCode, &sale.Status, &sale.PaymentGateway, &sale.WebhookVerified,
		&sale.ProviderVerified, &paymentDetailsBytes, &sale.CreatedAt, &sale.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[Debug] Nenhuma venda encontrada para paymentID: %s", paymentID)
			return nil, nil
		}
		log.Printf("[Debug] Erro ao buscar venda por paymentID: %v", err)
		return nil, err
	}

	if len(paymentDetailsBytes) > 0 {
		if err := json.Unmarshal(paymentDetailsBytes, &sale.PaymentDetails); err != nil {
			log.Printf("[Debug] Erro ao decodificar paymentDetails: %v", err)
			return nil, err
		}
	}

	log.Printf("[Debug] Venda encontrada com sucesso para paymentID: %s, ID: %s", paymentID, sale.ID)
	return &sale, nil
}

func FindByTxid(pool *pgxpool.Pool, txid string) (*Sale, error) {
	log.Printf("[Debug] Executando FindByTxid para txid: %s", txid)
	query := `
		SELECT 
			id, "productId", "userId", "telegramChatId", "telegramMessageId",
			"discordChannelId", "discordMessageId", "discordThreadId", quantity,
			"totalPrice", "couponCode", status, "paymentGateway", "webhookVerified",
			"providerVerified", "paymentDetails", "createdAt", "updatedAt"
		FROM sales
		WHERE "paymentGateway" = $1 AND "paymentDetails"->>'txid' = $2
		LIMIT 1
	`

	var sale Sale
	var paymentDetailsBytes []byte
	ctx := context.Background()

	err := pool.QueryRow(ctx, query, "efi", txid).Scan(
		&sale.ID, &sale.ProductID, &sale.UserID, &sale.TelegramChatID, &sale.TelegramMessageID,
		&sale.DiscordChannelID, &sale.DiscordMessageID, &sale.DiscordThreadID, &sale.Quantity,
		&sale.TotalPrice, &sale.CouponCode, &sale.Status, &sale.PaymentGateway, &sale.WebhookVerified,
		&sale.ProviderVerified, &paymentDetailsBytes, &sale.CreatedAt, &sale.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[Debug] Nenhuma venda encontrada para txid: %s", txid)
			return nil, nil
		}
		log.Printf("[Debug] Erro ao buscar venda por txid: %v", err)
		return nil, err
	}

	if len(paymentDetailsBytes) > 0 {
		if err := json.Unmarshal(paymentDetailsBytes, &sale.PaymentDetails); err != nil {
			log.Printf("[Debug] Erro ao decodificar paymentDetails: %v", err)
			return nil, err
		}
	}

	log.Printf("[Debug] Venda encontrada com sucesso para txid: %s, ID: %s", txid, sale.ID)
	return &sale, nil
}

func UpdateSaleStatus(pool *pgxpool.Pool, id string, status string, paymentDetails map[string]interface{}) error {
	log.Printf("[Debug] Executando UpdateSaleStatus para sale ID: %s, Novo Status: %s", id, status)
	
	paymentDetailsBytes, err := json.Marshal(paymentDetails)
	if err != nil {
		log.Printf("[Debug] Erro ao serializar paymentDetails para JSON: %v", err)
		return err
	}

	query := `
		UPDATE sales
		SET status = $1, "webhookVerified" = true, "paymentDetails" = $2, "updatedAt" = NOW()
		WHERE id = $3
	`

	ctx := context.Background()
	commandTag, err := pool.Exec(ctx, query, status, paymentDetailsBytes, id)
	if err != nil {
		log.Printf("[Debug] Erro ao atualizar status da venda: %v", err)
		return err
	}

	if commandTag.RowsAffected() == 0 {
		log.Printf("[Debug] Nenhuma venda atualizada para o ID: %s", id)
		return errors.New("venda nao encontrada para atualizacao")
	}

	log.Printf("[Debug] Venda ID %s atualizada com sucesso para status %s", id, status)
	return nil
}

func FindByID(pool *pgxpool.Pool, id string) (*Sale, error) {
	log.Printf("[Debug] Executando FindByID para ID: %s", id)
	query := `
		SELECT 
			id, "productId", "userId", "telegramChatId", "telegramMessageId",
			"discordChannelId", "discordMessageId", "discordThreadId", quantity,
			"totalPrice", "couponCode", status, "paymentGateway", "webhookVerified",
			"providerVerified", "paymentDetails", "createdAt", "updatedAt"
		FROM sales
		WHERE id = $1
		LIMIT 1
	`

	var sale Sale
	var paymentDetailsBytes []byte
	ctx := context.Background()

	err := pool.QueryRow(ctx, query, id).Scan(
		&sale.ID, &sale.ProductID, &sale.UserID, &sale.TelegramChatID, &sale.TelegramMessageID,
		&sale.DiscordChannelID, &sale.DiscordMessageID, &sale.DiscordThreadID, &sale.Quantity,
		&sale.TotalPrice, &sale.CouponCode, &sale.Status, &sale.PaymentGateway, &sale.WebhookVerified,
		&sale.ProviderVerified, &paymentDetailsBytes, &sale.CreatedAt, &sale.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[Debug] Nenhuma venda encontrada para ID: %s", id)
			return nil, nil
		}
		log.Printf("[Debug] Erro ao buscar venda por ID: %v", err)
		return nil, err
	}

	if len(paymentDetailsBytes) > 0 {
		if err := json.Unmarshal(paymentDetailsBytes, &sale.PaymentDetails); err != nil {
			log.Printf("[Debug] Erro ao decodificar paymentDetails: %v", err)
			return nil, err
		}
	}

	log.Printf("[Debug] Venda encontrada com sucesso para ID: %s", id)
	return &sale, nil
}

func ReleaseStock(pool *pgxpool.Pool, productID string, qty int) error {
	log.Printf("[Debug] Executando ReleaseStock para productID: %s, Qtd: %d", productID, qty)
	query := `
		UPDATE products
		SET stock = stock + $1
		WHERE id = $2
	`

	ctx := context.Background()
	_, err := pool.Exec(ctx, query, qty, productID)
	if err != nil {
		log.Printf("[Debug] Erro ao liberar estoque do produto %s: %v", productID, err)
		return err
	}

	log.Printf("[Debug] Estoque liberado com sucesso para produto %s, Qtd incrementada: %d", productID, qty)
	return nil
}
