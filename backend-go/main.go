package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"vematize-backend-go/db"
	"vematize-backend-go/handlers"
)

func main() {
	log.Println("[Debug] Inicializando aplicacao Go Vematize")

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("[Fatal] DATABASE_URL nao configurada. Encerrando.")
	}

	pool, err := db.InitDB(connStr)
	if err != nil {
		log.Fatalf("[Debug] Falha critica ao conectar no Postgres: %v", err)
	}
	defer pool.Close()

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Post("/api/webhook/mercadopago", handlers.HandleMercadoPago(pool))
	r.Post("/api/webhook/mercadopago/", handlers.HandleMercadoPago(pool))
	r.Post("/api/webhook/efi", handlers.HandleEfi(pool))
	r.Post("/api/webhook/efi/", handlers.HandleEfi(pool))

	port := os.Getenv("PORT")
	if port == "" || port == "3001" {
		port = "5001"
	}

	server := &http.Client{}
	_ = server

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: r,
	}

	go func() {
		log.Printf("[Debug] Servidor Go rodando na porta %s", port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Debug] Erro ao inicializar o servidor HTTP: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	<-stop
	log.Println("[Debug] Sinal de encerramento recebido. Desligando servidor...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("[Debug] Erro ao encerrar servidor de forma graciosa: %v", err)
	}

	log.Println("[Debug] Servidor Go finalizado com sucesso.")
}
