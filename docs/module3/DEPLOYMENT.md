# Module 3 — Deployment

## Docker Compose

A `docker-compose.yml` at the project root starts all services including Redis:

```bash
docker compose up
```

Redis runs on port 6379 internally. The `ai-service` connects via `REDIS_URL=redis://redis:6379/0`.

## Environment variables

### backend/.env

```env
# Existing
AI_SERVICE_URL=http://ai-service:8000   # or http://127.0.0.1:8000 locally

# New (Module 3 Redis invalidation)
AI_INTERNAL_KEY=<strong-random-secret>
```

### ai-service/.env

```env
# Existing
INTERNAL_API_KEY=<same-value-as-AI_INTERNAL_KEY>

# Redis cache (Module 3)
REDIS_URL=redis://localhost:6379/0         # or redis://redis:6379/0 in Docker
MODULE3_PERFORMANCE_CACHE_TTL=600
MODULE3_SKILL_GAP_CACHE_TTL=600
MODULE3_KNOWLEDGE_CACHE_TTL=3600
```

**`AI_INTERNAL_KEY` (Node.js) and `INTERNAL_API_KEY` (Python) must be identical.**

## Running without Redis

Leave `REDIS_URL` empty or unset. Module 3 operates identically using only PostgreSQL. The `/health` endpoint will report `"redis_cache": "disabled"`.

## Production checklist

- [ ] `AI_INTERNAL_KEY` and `INTERNAL_API_KEY` set to a strong random value (not `change-me`)
- [ ] `REDIS_URL` points to a password-protected Redis instance on a private network
- [ ] Redis `maxmemory-policy` set to `allkeys-lru` to prevent memory overflow
- [ ] `JWT_SECRET` is at least 32 characters and rotated from the default
- [ ] `LLM_API_KEY` stored in secrets manager (not in `.env` file)
- [ ] Node.js and Python services are on the same private network (for internal HTTP calls)

## Scaling notes

- The Python AI service is stateless — multiple replicas are safe.
- Redis cache is shared across all replicas automatically.
- The BackgroundTask pattern means agent runs execute on the same process that received the request. For high concurrency, run multiple AI service instances behind a load balancer.
