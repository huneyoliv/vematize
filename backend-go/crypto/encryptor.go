package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
)

func getKey() []byte {
	envKey := os.Getenv("ENCRYPTION_KEY")
	if envKey == "" {
		if flag.Lookup("test.v") != nil {
			hash := sha256.Sum256([]byte("fallback-insecure-key-vematize"))
			return hash[:]
		}
		log.Fatal("[Fatal] ENCRYPTION_KEY nao configurada. Encerrando.")
	}
	hash := sha256.Sum256([]byte(envKey))
	return hash[:]
}

func Encrypt(text string) (string, error) {
	if text == "" {
		return "", nil
	}
	log.Println("[Debug] Criptografando valor no Go")
	key := getKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	iv := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}
	ciphertextWithTag := gcm.Seal(nil, iv, []byte(text), nil)
	tagStart := len(ciphertextWithTag) - 16
	ciphertext := ciphertextWithTag[:tagStart]
	tag := ciphertextWithTag[tagStart:]
	result := fmt.Sprintf("%s:%s:%s", hex.EncodeToString(iv), hex.EncodeToString(tag), hex.EncodeToString(ciphertext))
	return result, nil
}

func Decrypt(encryptedText string) (string, error) {
	if encryptedText == "" {
		return "", nil
	}
	parts := strings.Split(encryptedText, ":")
	if len(parts) != 3 {
		log.Println("[Debug] Formato invalido para descriptografia. Retornando original.")
		return encryptedText, nil
	}
	log.Println("[Debug] Descriptografando valor no Go")
	key := getKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	iv, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", err
	}
	tag, err := hex.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	ciphertext, err := hex.DecodeString(parts[2])
	if err != nil {
		return "", err
	}
	ciphertextWithTag := append(ciphertext, tag...)
	decrypted, err := gcm.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		log.Println("[Debug] Falha ao descriptografar:", err.Error())
		return encryptedText, err
	}
	return string(decrypted), nil
}
