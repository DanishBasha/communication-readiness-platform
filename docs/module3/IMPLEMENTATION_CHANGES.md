# Module 3 — Implementation Changes (Redis Caching)

This document lists every file that was created or modified to add Redis caching to Module 3. No file outside Module 3 was changed.

## New files — Python AI service

| File | Purpose |
|---|---|
| `ai-service/app/cache/__init__.py` | Package init; re-exports `get_redis`, `close_redis`, `CacheKeys` |
| `ai-service/app/cache/redis_client.py` | Managed Redis connection pool; graceful degradation |
| `ai-service/app/cache/cache_keys.py` | Centralised key definitions with `module3:v1:` prefix |
| `ai-service/app/cache/cache_service.py` | `cache_get`, `cache_set`, `cache_delete`, `cache_delete_many` helpers |
| `ai-service/app/routers/internal.py` | `POST /internal/cache/invalidate` endpoint |
| `ai-service/tests/__init__.py` | Test package init |
| `ai-service/tests/test_performance_cache.py` | Tests for GetStudentPerformance cache behaviour |
| `ai-service/tests/test_skill_gap_cache.py` | Tests for GetSkillGapAnalysis cache behaviour |
| `ai-service/tests/test_knowledge_cache.py` | Tests for RetrieveLearningKnowledge cache behaviour |
| `ai-service/tests/test_cache_invalidation.py` | Tests for the invalidation endpoint |

## Modified files — Python AI service

| File | Change |
|---|---|
| `ai-service/app/config.py` | Added `redis_url`, `module3_performance_cache_ttl`, `module3_skill_gap_cache_ttl`, `module3_knowledge_cache_ttl` settings |
| `ai-service/app/tools/performance.py` | Added cache lookup/fill around DB calls |
| `ai-service/app/tools/skill_gap.py` | Added cache lookup/fill around DB calls |
| `ai-service/app/tools/knowledge.py` | Added shared cache key lookup/fill |
| `ai-service/app/tools/learning_plan.py` | Token optimisation: cap weakSkills at 5, trim perf fields sent to LLM |
| `ai-service/app/main.py` | Include `internal_router`; startup `get_redis()`; shutdown `close_redis()`; Redis status in `/health` |
| `ai-service/requirements.txt` | Added `redis>=5.0.0` |
| `ai-service/.env.example` | Added `REDIS_URL`, `MODULE3_*_CACHE_TTL`, `INTERNAL_API_KEY` |

## Modified files — Node.js backend

| File | Change |
|---|---|
| `backend/src/config/env.ts` | Added `AI_INTERNAL_KEY` env variable |
| `backend/src/shared/events/module3Handlers.ts` | Added fire-and-forget `invalidateStudentCache()` call after ATTEMPT_COMPLETED COMMIT |
| `backend/.env.example` | Added `AI_INTERNAL_KEY` variable |

## New files — documentation

| File | Purpose |
|---|---|
| `docs/module3/README.md` | Navigation index |
| `docs/module3/ARCHITECTURE.md` | Component map, technology choices |
| `docs/module3/AGENT_FLOW.md` | Agent execution walkthrough |
| `docs/module3/API.md` | HTTP endpoints reference |
| `docs/module3/DATABASE.md` | Schema tables, migrations |
| `docs/module3/REDIS_CACHE_ANALYSIS.md` | Cacheability analysis |
| `docs/module3/REDIS_CACHE_DESIGN.md` | Key design, TTLs, invalidation |
| `docs/module3/SECURITY.md` | RBAC, scope, secrets |
| `docs/module3/TESTING.md` | How to run tests |
| `docs/module3/DEPLOYMENT.md` | Docker Compose, env vars, production checklist |
| `docs/module3/IMPLEMENTATION_CHANGES.md` | This file |
| `docs/module3/CHANGELOG.md` | Version history |

## What did NOT change

- Module 1 (interview module) — untouched
- Module 2 (assessment module) — untouched
- PostgreSQL schema — no new migrations
- Agent architecture (Supervisor/Specialist/AgentLoop) — untouched
- BackgroundTasks approach — untouched
- Any existing test files — preserved unchanged
