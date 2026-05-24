# Vematize

Sistema de automação de vendas com bots para Telegram e Discord.

> 🇺🇸 [Read in English](./README.md)

## Arquitetura

| Componente | Tecnologia | Porta |
|---|---|---|
| Frontend | Vite + React + Nginx | 3000 |
| Backend Core (Webhooks) | Go (Chi + pgx) | 5001 |
| Backend Bots/Painel | NestJS (Clean Architecture) | 3001 |
| Banco de Dados | PostgreSQL 15 | 5432 |
| Cache | Redis 7 | 6379 |

## Requisitos

- Docker e Docker Compose

## Setup Rápido

### 1. Clone e configure

```bash
git clone <repo-url>
cd vematize
cp .env.example .env
```

### 2. Configure o `.env`

Edite o arquivo `.env` com suas credenciais. **Todos os campos abaixo são obrigatórios:**

```env
# Domínio (use localhost para desenvolvimento)
DOMAIN=localhost

# Credenciais de acesso ao painel (senha deve ter no mínimo 8 caracteres)
ADMIN_USER=admin
ADMIN_PASSWORD=sua-senha-segura

# Banco de dados
POSTGRES_USER=vematize
POSTGRES_PASSWORD=senha-segura-do-banco
POSTGRES_DB=vematize

# Redis
REDIS_PASSWORD=senha-segura-do-redis

# Secret do JWT (gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=seu-secret-gerado-aqui

# Chave de Criptografia (32 bytes em hex)
ENCRYPTION_KEY=sua-chave-de-criptografia

# Segredo para comunicação interna entre Go e NestJS
INTERNAL_SECRET=seu-segredo-interno

# Chave da API do ImgBB para upload de imagens
IMGBB_API_KEY=sua-chave-imgbb

# Auto-criar tabelas (true na primeira execução, false depois)
DB_SYNC=true
```

### 3. Suba os containers

```bash
docker compose up -d
```

### 4. Acesse

- **Desenvolvimento**: http://localhost:3000
- **Produção**: https://seu-dominio.com

## Variável DOMAIN

A variável `DOMAIN` configura automaticamente as URLs:

| DOMAIN | Frontend | Backend API | Backend Go (Webhooks) |
|---|---|---|---|
| `localhost` | http://localhost:3000 | http://localhost:3001 | http://localhost:5001 |
| `meusite.com` | https://meusite.com | https://api.meusite.com | https://api.meusite.com/api/webhook/ |

Em modo **desenvolvimento** (`DOMAIN=localhost`), o Nginx do frontend faz proxy:
* As chamadas `/api/webhook/*` vão para o **Go** (porta `5001`).
* As outras chamadas `/api/*` vão para o **NestJS** (porta `3001`).

Em modo **produção**, configure o proxy reverso (Nginx/Caddy) para encaminhar:
- `meusite.com` → frontend (porta 3000)
- `api.meusite.com` → frontend (porta 3000) que roteará para o Go ou NestJS com base nas rotas configuradas no `nginx.conf` do frontend.

## Auto-criação de Tabelas

Na primeira execução com `DB_SYNC=true`, o TypeORM cria automaticamente todas as tabelas:

- `users` - Usuários do bot
- `products` - Produtos e assinaturas
- `sales` - Vendas
- `bot_configs` - Configuração dos bots
- `coupons` - Cupons de desconto
- `settings` - Configurações gerais

**Após a primeira execução**, mude `DB_SYNC=false` para evitar alterações acidentais no schema.

## Segurança

Este projeto segue boas práticas de segurança:

- **Autenticação**: Senhas hasheadas com bcrypt (fator de custo 12)
- **JWT**: Tokens expiram em 4 horas, secret obrigatório (sem fallbacks)
- **Headers HTTP**: Proteção com Helmet + headers de segurança no Nginx
- **Rate Limiting**: 60 requisições/minuto por IP (global)
- **Validação de Input**: Todos os endpoints usam DTOs com class-validator, campos desconhecidos são rejeitados
- **Docker**: PostgreSQL/Redis vinculados apenas ao localhost, Redis exige autenticação
- **Build**: Multi-stage Docker builds para Go, NestJS e Nginx, containers rodam como usuário não-root

## Limites de Recursos

| Serviço | RAM Máxima | CPU Máxima |
|---|---|---|
| PostgreSQL | 512 MB | 1.0 |
| Redis | 192 MB | 0.5 |
| NestJS Backend | 384 MB | 1.0 |
| Go Backend | 64 MB | 0.2 |
| Frontend | 256 MB | 0.5 |

## Desenvolvimento Local (sem Docker)

### Backend NestJS

```bash
cd backend
npm install
npm run dev
```

### Backend Go

```bash
cd backend-go
go mod tidy
go run main.go
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Estrutura do Projeto

```
vematize/
├── frontend/          # Vite + React + Nginx
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── main.tsx
│   └── Dockerfile
├── backend/           # NestJS (Painel, Admin & Bots)
│   ├── src/
│   │   ├── domain/          # Entidades de domínio
│   │   ├── application/     # DTOs e Use Cases
│   │   ├── infrastructure/  # TypeORM, Repositories
│   │   └── presentation/    # Controllers, Guards
│   └── Dockerfile
├── backend-go/        # Go (Transações, Webhooks, Alto Throughput)
│   ├── db/              # Conexão pgxpool e Repositories
│   ├── services/        # Validadores de webhook e clientes MP/Efí
│   ├── handlers/        # Endpoints HTTP Chi
│   ├── crypto/          # Criptografia compatível AES-256-GCM
│   ├── Dockerfile
│   └── main.go
├── docker-compose.yml
├── .env.example
└── README.md
```

## Licença

MIT
