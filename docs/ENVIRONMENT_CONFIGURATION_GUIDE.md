# Environment & Configuration Guide

> **Source of truth:** `backend/src/config/env.ts`, `frontend/vite.config.ts`, `ai-service/app/`  
> **Branch:** `feature/new-ui-backend-integration`  
> **Security:** Do NOT commit real values of any secret variable to version control.

---

## Table of Contents

1. [Backend Environment Variables](#1-backend-environment-variables)
2. [Frontend Configuration](#2-frontend-configuration)
3. [AI Service Configuration](#3-ai-service-configuration)
4. [Local Development Setup](#4-local-development-setup)
5. [Supabase Configuration](#5-supabase-configuration)
6. [Production Checklist](#6-production-checklist)

---

## 1. Backend Environment Variables

Defined and validated via Zod in `backend/src/config/env.ts`. All variables are optional with safe defaults for development.

**File:** `backend/.env`

| Variable | Default | Required in Prod | Description |
|----------|---------|-----------------|-------------|
| `NODE_ENV` | `development` | Yes | `development`, `test`, or `production` |
| `PORT` | `5000` | No | HTTP server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/comm_readiness` | **Yes** | PostgreSQL connection string; SSL enabled when `NODE_ENV=production` |
| `JWT_SECRET` | `dev-secret-change-in-production-min-32-chars` | **Yes — change!** | Min 32 chars. The default is a known value and must be overridden. |
| `JWT_EXPIRES_IN` | `7d` | No | Token lifetime (e.g. `7d`, `24h`, `60m`) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | No | Defined but not yet used (future refresh token flow) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No | Defined but not yet used (future refresh token flow) |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | No | URL of FastAPI AI service |
| `CORS_ORIGIN` | `http://localhost:5173` | **Yes** | Frontend URL; must match in production |
| `UPLOAD_MAX_FILE_SIZE_MB` | `5` | No | Max file upload size in MB (resume PDFs) |
| `UPLOAD_DIR` | `uploads` | No | Local directory for file uploads |
| `MAX_TAB_SWITCH_LIMIT` | `4` | No | Proctoring: tab switches before flagging |
| `MAX_REPLAY_COUNT` | `2` | No | Max replay count for listening sessions |
| `MAX_QUESTIONS_PER_SESSION` | `5` | No | Max questions in one interview session |
| `REDIS_URL` | `redis://localhost:6379` | No | Redis for session turn context. Optional — graceful degradation if unreachable. |

### Example `backend/.env`

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...@db.supabase.co:5432/postgres
JWT_SECRET=<your-random-32+-char-secret>
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://127.0.0.1:8000
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
MAX_TAB_SWITCH_LIMIT=4
MAX_QUESTIONS_PER_SESSION=5
UPLOAD_DIR=uploads
UPLOAD_MAX_FILE_SIZE_MB=5
```

---

## 2. Frontend Configuration

### Vite Dev Proxy (`frontend/vite.config.ts`)

```typescript
proxy: {
  '/api': { target: 'http://localhost:5000', changeOrigin: true },
  '/ai':  { target: 'http://localhost:8000', changeOrigin: true },
}
```

All frontend `api.ts` calls to `/api/*` are proxied to the Express backend.  
Calls to `/ai/*` are proxied to the FastAPI ai-service.

**Do NOT add CORS-isolation headers** (`Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy`) to the Vite config. The `@ricky0123/vad-web` VAD library uses `MessageChannel` (not `SharedArrayBuffer`) and does not need these headers.

### Frontend Environment Variables

The frontend uses Vite's `import.meta.env` mechanism. Only variables prefixed `VITE_` are exposed to the browser.

**File:** `frontend/.env` (or `.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| (none currently required) | — | Backend URL is handled by Vite proxy in dev |

In production, set `VITE_API_BASE_URL` if you bypass the proxy.

### Auth Token Storage

The frontend stores the JWT in `localStorage` under key `auth_token`. The user object is stored under `auth_user`. These are read on page load by the `AppContext` auth hydration `useEffect`.

---

## 3. AI Service Configuration

**File:** `ai-service/.env` (or environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `groq` | LLM provider: `groq`, `openai`, `anthropic`, `together`, `perplexity`, `ollama`, `lmstudio`, `vllm`, `mock` |
| `LLM_API_KEY` | — | API key for chosen provider |
| `GROQ_API_KEY` | — | Groq-specific key (alias for `LLM_API_KEY` when using Groq) |
| `LLM_MODEL` | `llama-3.3-70b-versatile` (Groq default) | Model name |
| `LLM_BASE_URL` | — | Base URL override for self-hosted providers (ollama, lmstudio, vllm) |

**Runtime config change:** `POST /ai/config` with `X-Internal-Key` header updates the LLM provider at runtime. **Limitation:** Only updates the single worker that receives the request (not safe in multi-worker deployments).

**Audio processing dependencies:** `librosa`, `groq` (for Whisper STT). Both are required for the audio evaluation pipeline.

---

## 4. Local Development Setup

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- PostgreSQL (or Supabase account)
- Redis (optional — session context cache)

### Backend

```bash
cd backend
npm install
cp .env.example .env          # Edit DATABASE_URL, JWT_SECRET
npm run migrate               # Run all migrations
npm run seed                  # (if seed script exists)
npm run dev                   # Starts on port 5000 with ts-node-dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # Starts Vite dev server on port 5173
```

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env          # Edit GROQ_API_KEY or other provider
uvicorn app.main:app --reload --port 8000
```

### Running Tests

```bash
cd backend
npm test                      # Runs Vitest unit tests (48/48)
npm run test:run              # Non-interactive
```

`tests/auth.test.ts` contains integration tests that require a live database connection — they will time out without `DATABASE_URL` pointing to a running database.

---

## 5. Supabase Configuration

The project uses Supabase as the managed PostgreSQL database.

- Connection is via `DATABASE_URL` (standard PostgreSQL connection string)
- SSL is automatically enabled when `NODE_ENV=production`
- The migration runner (`backend/src/database/migrate.ts`) connects using `DATABASE_URL` directly
- pgvector extension must be enabled in Supabase (handled by migration `001_extensions.sql`)

**Connection pool:** `pg.Pool({ max: 10 })` — suitable for single-server deployment; increase for horizontal scaling.

---

## 6. Production Checklist

| Item | Check |
|------|-------|
| `JWT_SECRET` is a random 32+ character string (not the default) | ❗ Required |
| `DATABASE_URL` points to production Supabase | ❗ Required |
| `NODE_ENV=production` | ❗ Required (enables SSL for DB) |
| `CORS_ORIGIN` matches production frontend URL | ❗ Required |
| `AI_SERVICE_URL` points to deployed FastAPI | ❗ Required if using AI features |
| `GROQ_API_KEY` (or other provider key) set in ai-service env | ❗ Required if using AI features |
| `.env` files are in `.gitignore` | ❗ Never commit secrets |
| `UPLOAD_DIR` has write permissions | Required for resume uploads |
| `REDIS_URL` points to Redis (or Redis Cloud) | Optional; audio context cache only |
| All migrations applied to production DB | Run `npm run migrate` |
| Seed data applied (`105_seed_credit_policies.sql`) | Required for credits to work |
| `MAX_TAB_SWITCH_LIMIT` set for exam proctoring policy | Adjust per institution policy |
