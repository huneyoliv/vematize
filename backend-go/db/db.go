package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func InitDB(connStr string) (*pgxpool.Pool, error) {
	log.Println("[Debug] Iniciando conexao com o banco de dados PostgreSQL")
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		log.Printf("[Debug] Erro ao analisar string de conexao: %v", err)
		return nil, err
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 15 * time.Minute

	log.Println("[Debug] Criando o pool de conexoes pgxpool")
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Printf("[Debug] Erro ao criar o pool de conexoes: %v", err)
		return nil, err
	}

	log.Println("[Debug] Executando Ping no banco de dados para validar conexao")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		log.Printf("[Debug] Falha ao pingar o banco de dados: %v", err)
		pool.Close()
		return nil, err
	}

	log.Println("[Debug] Conexao com o PostgreSQL estabelecida com sucesso")
	return pool, nil
}
