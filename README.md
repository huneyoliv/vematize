<p align="center">
  <img src="./frontend/public/logo.png" alt="Vematize Logo" width="320" />
</p>

# Vematize

Sales automation system with bots for Telegram and Discord.

> 🇧🇷 [Leia em Português](./README.pt-BR.md)

## Architecture

| Component | Technology | Port |
|---|---|---|
| Frontend | Vite + React + Nginx | 3000 |
| Backend Core (Webhooks) | Go (Chi + pgx) | 5001 |
| Backend Bots/Panel | NestJS (Clean Architecture) | 3001 |
| Database | PostgreSQL 15 | 5432 |
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

# Encryption Key (32 bytes hex)
ENCRYPTION_KEY=your-encryption-key-here

# Internal Secret for Go and NestJS communication
INTERNAL_SECRET=your-internal-secret-here

# ImgBB API Key for image uploads
IMGBB_API_KEY=your-imgbb-api-key

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

| DOMAIN | Frontend | Backend API | Backend Go (Webhooks) |
|---|---|---|---|
| `localhost` | http://localhost:3000 | http://localhost:3001 | http://localhost:5001 |
| `mysite.com` | https://mysite.com | https://api.mysite.com | https://api.mysite.com/api/webhook/ |

In **development** mode (`DOMAIN=localhost`), the frontend Nginx proxies:
* `/api/webhook/*` calls to **Go** (port `5001`).
* All other `/api/*` calls to **NestJS** (port `3001`).

In **production** mode, configure your reverse proxy (Nginx/Caddy) to route:
- `mysite.com` → frontend (port 3000)
- `api.mysite.com` → frontend (port 3000) which will automatically route to Go or NestJS based on the `nginx.conf` routing rules.

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
- **Build**: Multi-stage Docker builds for Go, NestJS, and Nginx; containers run as non-root users

## Resource Limits

| Service | Max RAM | Max CPU |
|---|---|---|
| PostgreSQL | 512 MB | 1.0 |
| Redis | 192 MB | 0.5 |
| NestJS Backend | 384 MB | 1.0 |
| Go Backend | 64 MB | 0.2 |
| Frontend | 256 MB | 0.5 |

## Local Development (without Docker)

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

## Project Structure

```
vematize/
├── frontend/          # Vite + React + Nginx
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── main.tsx
│   └── Dockerfile
├── backend/           # NestJS (Panel, Admin & Bots)
│   ├── src/
│   │   ├── domain/          # Domain entities
│   │   ├── application/     # DTOs and Use Cases
│   │   ├── infrastructure/  # TypeORM, Repositories
│   │   └── presentation/    # Controllers, Guards
│   └── Dockerfile
├── backend-go/        # Go (Transactions, Webhooks, High Throughput)
│   ├── db/              # pgxpool and Repositories
│   ├── services/        # Webhook validators and MP/Efí clients
│   ├── handlers/        # Chi HTTP Endpoints
│   ├── crypto/          # AES-256-GCM compatible decryptor
│   ├── Dockerfile
│   └── main.go
├── docker-compose.yml
├── .env.example
└── README.md
```

## Performance & Load Tests

Vematize was tested for high throughput and concurrent load utilizing **k6** (Grafana/k6 via Docker) simulating production traffic across multiple scenarios: API endpoints, webhooks, and bot interactions.

### Scope & Methodology
- **Scenarios**: 
  - **API**: Authenticated login setup, dynamic dashboard metrics (`GET /api/dashboard`), and core health checking (`GET /api/health`).
  - **Webhooks**: High-frequency payload deliveries (`POST /api/webhook/mercadopago`, `POST /api/webhook/efi`).
  - **Bots**: Telegram callback webhook simulation and Discord interaction handling.
- **Threshold Targets**: 
  - API p95 response time <= 500ms.
  - Webhooks & Bots p95 response time <= 1000ms.
  - Overall error rate <= 1.0%.

### Execution Results

#### 1. Edge Delivery (Through Cloudflare Tunnel to `https://api.yourdomain.com`)

| Load (per scenario) | Total VUs | p95 API | p95 Bot | p95 Webhook | Errors |
|---|---|---|---|---|---|
| 1 VU (1m) | 3 | 175ms | 190ms | 156ms | 0% |
| 2 VUs (2m) | 6 | 422ms | 431ms | 389ms | ~0.13% |
| 3 VUs (2m) | 9 | 578ms | 525ms | 572ms | ~54% * |

> **Note**: The elevated error rate at 3 VUs is strictly due to **edge rate limiting (HTTP 429)** and local DNS resolver limits imposed by the Cloudflare Tunnel agent, not the origin backend servers. Container metrics confirmed 0% error on the origin side.

#### 2. Localhost Origin with Rate Limiting Enabled

| Load (per scenario) | p95 API | Error Rate | Note |
|---|---|---|---|
| 1 VU | 536ms | 0% | p95 API slightly above target |
| 2 VUs | < 500ms | ~17% | HTTP 429 throttled at API/Bots |
| 3 VUs | < 500ms | ~66% | HTTP 429 throttled at API/Bots |

#### 3. Localhost Origin with Rate Limiting Disabled (`RATE_LIMIT_ENABLED=false`)

| Load (per scenario) | Total VUs | Total Requests | Throughput | p95 API | p95 Bot | p95 Webhook | Errors |
|---|---|---|---|---|---|---|---|
| 1 VU (1m) | 3 | 529 | 5.76 req/s | 58.45ms | 29.45ms | 13.30ms | 0% |
| 2 VUs (2m) | 6 | 973 | 6.45 req/s | 28.83ms | 18.81ms | 11.80ms | 0% |
| 3 VUs (2m) | 9 | 1,399 | 9.26 req/s | 80.67ms | 74.28ms | 33.80ms | 0% |

### Key Takeaways
- The backend infrastructure is exceptionally resilient. With rate limiting disabled locally, the origin easily processes concurrent load with **0% error** and latency p95 times **far below thresholds** (e.g. 33.8ms for webhooks, 80.67ms for APIs).
- For staging or benchmark scaling, rate limiting at edge proxies (like Cloudflare) should be adjusted accordingly.

## License

MIT