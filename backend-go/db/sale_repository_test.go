package db

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"testing"

	"vematize-backend-go/crypto"
)

func getTestPool(t *testing.T) (*os.File, bool) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgresql://vematize:BiM7myy1j629Th@127.0.0.1:5432/vematize"
	}

	log.Println("[Debug] Conectando ao banco de dados para rodar testes integrados")
	pool, err := InitDB(connStr)
	if err != nil {
		log.Printf("[Debug] Conexao com banco falhou, pulando testes integrados: %v", err)
		t.Skip("Pulando teste de integracao com banco real")
		return nil, false
	}

	ctx := context.Background()
	_, err = pool.Exec(ctx, "DELETE FROM sales WHERE \"productId\" = $1", "test-product-id-go")
	if err != nil {
		log.Printf("[Debug] Erro ao limpar base de testes: %v", err)
	}
	_, err = pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", "test-settings-id-go")
	if err != nil {
		log.Printf("[Debug] Erro ao limpar settings de testes: %v", err)
	}

	t.Cleanup(func() {
		pool.Exec(ctx, "DELETE FROM sales WHERE \"productId\" = $1", "test-product-id-go")
		pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", "test-settings-id-go")
		pool.Close()
	})

	return nil, true
}

func TestSaleRepositoryOperations(t *testing.T) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgresql://vematize:BiM7myy1j629Th@127.0.0.1:5432/vematize"
	}

	pool, err := InitDB(connStr)
	if err != nil {
		t.Skip("Postgres indisponivel para teste")
		return
	}
	defer pool.Close()

	ctx := context.Background()
	saleID := "a0000000-0000-0000-0000-000000000001"
	pool.Exec(ctx, "DELETE FROM sales WHERE id = $1 OR \"productId\" = $2", saleID, "test-product-id-go")

	log.Println("[Debug] Inserindo venda de teste no Postgres")
	paymentDetails := map[string]interface{}{
		"paymentId": "999888777",
		"txid":      "tx123456789",
	}
	paymentDetailsBytes, _ := json.Marshal(paymentDetails)

	insertQuery := `
		INSERT INTO sales (
			id, "productId", "userId", quantity, "totalPrice", status, "paymentGateway",
			"webhookVerified", "providerVerified", "paymentDetails", "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
	`
	_, err = pool.Exec(ctx, insertQuery,
		saleID, "test-product-id-go", "test-user-id-go", 2, 150.50, "pending", "mercadopago",
		false, false, paymentDetailsBytes,
	)
	if err != nil {
		t.Fatalf("Erro ao inserir venda de teste: %v", err)
	}

	log.Println("[Debug] Buscando venda de teste por FindByPaymentID")
	saleMP, err := FindByPaymentID(pool, "999888777")
	if err != nil {
		t.Fatalf("Erro ao buscar por paymentId: %v", err)
	}
	if saleMP == nil {
		t.Fatal("Venda nao encontrada por paymentId")
	}
	if saleMP.ID != saleID {
		t.Errorf("Esperava ID %s, mas obteve %s", saleID, saleMP.ID)
	}

	log.Println("[Debug] Atualizando gateway para efi e testando FindByTxid")
	_, err = pool.Exec(ctx, `UPDATE sales SET "paymentGateway" = 'efi' WHERE id = $1`, saleID)
	if err != nil {
		t.Fatalf("Erro ao atualizar gateway da venda: %v", err)
	}

	saleEfi, err := FindByTxid(pool, "tx123456789")
	if err != nil {
		t.Fatalf("Erro ao buscar por txid: %v", err)
	}
	if saleEfi == nil {
		t.Fatal("Venda nao encontrada por txid")
	}

	log.Println("[Debug] Testando UpdateSaleStatus no Go")
	newDetails := map[string]interface{}{
		"paymentId": "999888777",
		"txid":      "tx123456789",
		"status":    "approved",
	}
	err = UpdateSaleStatus(pool, saleID, "approved", newDetails)
	if err != nil {
		t.Fatalf("Erro ao atualizar status: %v", err)
	}

	updatedSale, err := FindByTxid(pool, "tx123456789")
	if err != nil {
		t.Fatalf("Erro ao buscar venda atualizada: %v", err)
	}
	if updatedSale.Status != "approved" {
		t.Errorf("Esperava status approved, mas obteve %s", updatedSale.Status)
	}
	if !updatedSale.WebhookVerified {
		t.Error("Esperava webhookVerified como true")
	}

	pool.Exec(ctx, "DELETE FROM sales WHERE id = $1", saleID)
}

func TestSettingsRepositoryOperations(t *testing.T) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgresql://vematize:BiM7myy1j629Th@127.0.0.1:5432/vematize"
	}

	pool, err := InitDB(connStr)
	if err != nil {
		t.Skip("Postgres indisponivel para teste")
		return
	}
	defer pool.Close()

	ctx := context.Background()
	settingsID := "b0000000-0000-0000-0000-000000000002"
	pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", settingsID)

	os.Setenv("ENCRYPTION_KEY", "chave-secreta-de-teste-longa-32-bytes")
	defer os.Unsetenv("ENCRYPTION_KEY")

	rawSecret := "meu-segredo-de-webhook"
	encryptedSecret, err := crypto.Encrypt(rawSecret)
	if err != nil {
		t.Fatalf("Erro ao criptografar segredo: %v", err)
	}

	log.Println("[Debug] Inserindo settings de teste com dados criptografados")
	mpConfig := map[string]interface{}{
		"webhook_secret":         encryptedSecret,
		"production_access_token": "token-nao-criptografado-inicial",
	}
	mpConfigBytes, _ := json.Marshal(mpConfig)

	efiConfig := map[string]interface{}{
		"production_client_id": "client-id-normal",
	}
	efiConfigBytes, _ := json.Marshal(efiConfig)

	insertQuery := `
		INSERT INTO settings (
			id, "logoUrl", "preferredPixGateway", "preferredCardGateway", "activeGateway",
			"mercadopagoConfig", "efiConfig", "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err = pool.Exec(ctx, insertQuery,
		settingsID, "http://logo.com", "efi", "mercadopago", "efi",
		mpConfigBytes, efiConfigBytes,
	)
	if err != nil {
		t.Fatalf("Erro ao inserir settings de teste: %v", err)
	}

	log.Println("[Debug] Testando GetDecryptedSettings")
	decryptedSettings, err := GetDecryptedSettings(pool)
	if err != nil {
		t.Fatalf("Erro ao buscar settings descriptografadas: %v", err)
	}
	if decryptedSettings == nil {
		t.Fatal("Settings nao encontradas")
	}

	secretVal, exists := decryptedSettings.MercadoPagoConfig["webhook_secret"]
	if !exists {
		t.Fatal("webhook_secret nao existe nas settings descriptografadas")
	}
	if secretVal.(string) != rawSecret {
		t.Errorf("Esperava segredo descriptografado '%s', mas obteve '%s'", rawSecret, secretVal)
	}

	pool.Exec(ctx, "DELETE FROM settings WHERE id = $1", settingsID)
}
