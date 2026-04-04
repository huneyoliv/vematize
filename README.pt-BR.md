# Vematize

Sistema de automação de vendas com bots para Telegram e Discord.

> 🇺🇸 [Read in English](./README.md)

## Arquitetura

| Componente | Tecnologia | Porta |
|---|---|---|
| Frontend | Vite + React | 3000 |
| Backend | NestJS (Clean Architecture) | 3001 |
| Banco de Dados | PostgreSQL 16 | 5432 |
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

| DOMAIN | Frontend | Backend API |
|---|---|---|
| `localhost` | http://localhost:3000 | http://localhost:3001 |
| `meusite.com` | https://meusite.com | https://api.meusite.com |

Em modo **desenvolvimento** (`DOMAIN=localhost`), o frontend faz proxy das chamadas `/api/*` direto para o backend na porta 3001.

Em modo **produção**, configure um reverse proxy (Nginx/Caddy) para rotear:
- `meusite.com` → frontend (porta 3000)
- `api.meusite.com` → backend (porta 3001)

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
- **Build**: Multi-stage Docker builds, container roda como usuário não-root

## Limites de Recursos

| Serviço | RAM Máxima |
|---|---|
| PostgreSQL | 2 GB |
| Redis | 2 GB |

## Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend
npm install
npm run dev
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
├── frontend/          # Vite + React
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── main.tsx
│   └── Dockerfile
├── backend/           # NestJS (Clean Architecture)
│   ├── src/
│   │   ├── domain/          # Entidades de domínio
│   │   ├── application/     # DTOs e Use Cases
│   │   ├── infrastructure/  # TypeORM, Repositórios
│   │   └── presentation/    # Controllers, Guards
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Licença

MIT
