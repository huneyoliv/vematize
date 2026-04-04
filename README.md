# Vematize

Sales automation system with bots for Telegram and Discord.

> 🇧🇷 [Leia em Português](./README.pt-BR.md)

## Architecture

| Component | Technology | Port |
|---|---|---|
| Frontend | Vite + React | 3000 |
| Backend | NestJS (Clean Architecture) | 3001 |
| Database | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |

## Requirements

- Docker and Docker Compose

## Quick Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd vematize
cp .env.example .env
```

### 2. Configure `.env`

Edit the `.env` file with your credentials. **All fields below are required:**

```env
# Domain (use localhost for development)
DOMAIN=localhost

# Admin panel credentials (password must be at least 8 characters)
ADMIN_USER=admin
ADMIN_PASSWORD=your-secure-password

# Database
POSTGRES_USER=vematize
POSTGRES_PASSWORD=secure-db-password
POSTGRES_DB=vematize

# Redis
REDIS_PASSWORD=secure-redis-password

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-generated-secret-here

# Auto-create tables (true on first run, false afterwards)
DB_SYNC=true
```

### 3. Start the containers

```bash
docker compose up -d
```

### 4. Access

- **Development**: http://localhost:3000
- **Production**: https://your-domain.com

## DOMAIN Variable

The `DOMAIN` variable automatically configures all URLs:

| DOMAIN | Frontend | Backend API |
|---|---|---|
| `localhost` | http://localhost:3000 | http://localhost:3001 |
| `mysite.com` | https://mysite.com | https://api.mysite.com |

In **development** mode (`DOMAIN=localhost`), the frontend proxies `/api/*` calls directly to the backend on port 3001.

In **production** mode, set up a reverse proxy (Nginx/Caddy) to route:
- `mysite.com` → frontend (port 3000)
- `api.mysite.com` → backend (port 3001)

## Auto Table Creation

On the first run with `DB_SYNC=true`, TypeORM automatically creates all tables:

- `users` - Bot users
- `products` - Products and subscriptions
- `sales` - Sales records
- `bot_configs` - Bot configuration
- `coupons` - Discount coupons
- `settings` - General settings

**After the first run**, change `DB_SYNC=false` to prevent accidental schema changes.

## Security

This project follows security best practices:

- **Authentication**: Passwords hashed with bcrypt (cost factor 12)
- **JWT**: Tokens expire in 4 hours, secret is required (no fallbacks)
- **HTTP Headers**: Helmet protection + security headers on Nginx
- **Rate Limiting**: 60 requests/minute per IP (global)
- **Input Validation**: All endpoints use DTOs with class-validator, unknown fields are rejected
- **Docker**: PostgreSQL/Redis bound to localhost only, Redis requires authentication
- **Build**: Multi-stage Docker builds, non-root container user

## Resource Limits

| Service | Max RAM |
|---|---|
| PostgreSQL | 2 GB |
| Redis | 2 GB |

## Local Development (without Docker)

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

## Project Structure

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
│   │   ├── domain/          # Domain entities
│   │   ├── application/     # DTOs and Use Cases
│   │   ├── infrastructure/  # TypeORM, Repositories
│   │   └── presentation/    # Controllers, Guards
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT