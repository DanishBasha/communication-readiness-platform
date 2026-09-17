# Development Guide

Local setup, running services, testing, and day-to-day developer workflows.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 LTS | Use `nvm` or `fnm` to manage versions |
| pnpm | 9.x | `npm install -g pnpm` |
| Python | 3.11+ | Use `pyenv` to manage versions |
| Docker Desktop | 4.x | Required for all local infrastructure |
| Docker Compose | v2.x | Bundled with Docker Desktop |
| Git | 2.40+ | |

---

## First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

# 2. Copy environment files
cp .env.example .env
# Edit .env — fill in required values (see Environment Variables below)

# 3. Install Node.js dependencies (monorepo root + all apps)
pnpm install

# 4. Install Python dependencies
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.dev.txt
cd ../..

# 5. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# 6. Run database migrations
pnpm --filter api db:migrate

# 7. Seed development data (optional)
pnpm --filter api db:seed
```

---

## Environment Variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Service | Notes |
|---|---|---|
| `DATABASE_URL` | api, ai-service | PostgreSQL connection string |
| `REDIS_URL` | api | Redis connection string |
| `MINIO_ENDPOINT` | api | Object storage endpoint |
| `MINIO_ACCESS_KEY` | api | |
| `MINIO_SECRET_KEY` | api | |
| `GROQ_API_KEY` | ai-service | Primary LLM provider (LLaMA 3.1-70b) |
| `STT_PROVIDER` | ai-service | `browser` (MVP) or `deepgram` |
| `STT_API_KEY` | ai-service | Required only when `STT_PROVIDER` is not `browser` |
| `JWT_SECRET` | api | Min 32 characters, random |
| `JWT_EXPIRY` | api | e.g. `15m` |
| `REFRESH_TOKEN_SECRET` | api | Separate from JWT_SECRET |
| `NODE_ENV` | api, web | `development` locally |
| `NEXT_PUBLIC_API_URL` | web | e.g. `http://localhost:3001` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | all | Optional locally; required in staging/prod |

---

## Running Services

### All services at once

```bash
docker compose up
```

This starts PostgreSQL, Redis, MinIO, the Node.js API, the FastAPI AI service, and the Next.js frontend.

### Individual services

```bash
# Node.js API (apps/api) — http://localhost:3001
pnpm --filter api dev

# Next.js frontend (apps/web) — http://localhost:3000
pnpm --filter web dev

# FastAPI AI service (apps/ai-service) — http://localhost:8000
cd apps/ai-service
uvicorn main:app --reload --port 8000
```

### Infrastructure only

```bash
docker compose up -d postgres redis minio
```

---

## Database Migrations

We use **Alembic** for PostgreSQL schema migrations.

```bash
# Apply all pending migrations
pnpm --filter api db:migrate

# Create a new migration (auto-generate from model changes)
pnpm --filter api db:migration:create -- --message "add_credit_transactions"

# Downgrade one step
pnpm --filter api db:migrate:down
```

**Rules:**
- Never edit an existing migration file after it has been committed.
- Always create a new migration for schema changes.
- Migration files must be committed in the same PR as the model change.

---

## Testing

### Run all tests

```bash
pnpm test           # Node.js unit + integration tests (Vitest)
pnpm --filter web test   # Frontend component tests (Vitest)
pytest apps/ai-service/tests/  # Python tests
pnpm e2e            # Playwright end-to-end tests
```

### Run tests for a specific area

```bash
pnpm --filter api test -- --reporter=verbose src/domain/credits
pytest apps/ai-service/tests/evaluation/ -v
```

### Authorization negative tests

These must pass before any auth/RBAC/credits PR can be merged.

```bash
pnpm --filter api test -- src/tests/security/
```

### Load tests (k6)

```bash
k6 run scripts/load/interview-session.js
```

---

## Code Quality

```bash
# TypeScript / Node.js
pnpm lint           # ESLint across all TS packages
pnpm typecheck      # tsc --noEmit across all TS packages
pnpm format:check   # Prettier check

# Python
cd apps/ai-service
ruff check .
black --check .
mypy .
```

All of the above run automatically in CI. Fix failures locally before pushing.

---

## API Documentation

FastAPI generates OpenAPI docs automatically at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Node.js API documentation is maintained in `docs/api/` and validated in CI against the actual route definitions.

---

## Architecture Decision Records

Significant technology and design decisions are recorded as ADRs in `docs/adr/`.

```
docs/adr/
├── 0001-use-postgresql-as-source-of-truth.md
├── 0002-bullmq-for-async-jobs.md
└── ...
```

Create a new ADR when: introducing a new dependency, choosing between two architectural approaches, or making a decision that would otherwise require re-explaining context in every PR.

---

## Troubleshooting

**Migrations fail on first run**  
Ensure PostgreSQL is healthy: `docker compose ps postgres`. Allow ~10 seconds after `docker compose up` before running migrations.

**Redis connection refused**  
Check `REDIS_URL` in `.env`. Default: `redis://localhost:6379`.

**Groq API errors**  
Verify `GROQ_API_KEY` is set. The AI service starts without it but LLM calls will fail at runtime.

**Port conflicts**  
Default ports: `3000` (web), `3001` (api), `8000` (ai-service), `5432` (postgres), `6379` (redis), `9000` (minio). Change via `.env` if needed.
