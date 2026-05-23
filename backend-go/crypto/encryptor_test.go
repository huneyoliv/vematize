package crypto

import (
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	originalText := "minha-senha-super-secreta-123"
	
	encrypted, err := Encrypt(originalText)
	if err != nil {
		t.Fatalf("Erro ao criptografar: %v", err)
	}

	if encrypted == "" {
		t.Fatal("Resultado criptografado nao deveria ser vazio")
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Erro ao descriptografar: %v", err)
	}

	if decrypted != originalText {
		t.Errorf("Esperava '%s', mas obteve '%s'", originalText, decrypted)
	}
}

func TestDecryptNodeJSCompat(t *testing.T) {
	nodeJSEncrypted := "313233343536373839303132:3653c88e8a88488e29befe1cb7b7084e:bb784538ab08c6fc13d21632"
	expectedText := "raw-mp-token"

	decrypted, err := Decrypt(nodeJSEncrypted)
	if err != nil {
		t.Fatalf("Erro ao descriptografar string do Node.js: %v", err)
	}

	if decrypted != expectedText {
		t.Errorf("Esperava '%s', mas obteve '%s'", expectedText, decrypted)
	}
}
