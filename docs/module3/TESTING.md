# Module 3 — Testing Guide

## Node.js tests

Run from the `backend/` directory:

```bash
cd backend
npm test
# or for Module 3 only:
npx jest --testPathPattern="src/__tests__/module3"
```

### Test files

| File | What it tests |
|---|---|
| `src/__tests__/module3/events.test.ts` | `computeTrend`, USER_REGISTERED idempotency, ATTEMPT_COMPLETED running averages |
| `src/__tests__/module3/performance.test.ts` | `runningAverage` and `computeTrend` pure functions |
| `src/__tests__/module3/skills.test.ts` | `/performance/:studentId/skills` route |

## Python tests

Run from the `ai-service/` directory:

```bash
cd ai-service
pip install pytest httpx
pytest tests/ -v
```

### Test files

| File | What it tests |
|---|---|
| `tests/test_performance_cache.py` | GetStudentPerformance: HIT, MISS, Redis failure, student isolation, scope |
| `tests/test_skill_gap_cache.py` | GetSkillGapAnalysis: HIT, MISS, Redis failure, student isolation, scope |
| `tests/test_knowledge_cache.py` | RetrieveLearningKnowledge: shared key, HIT, MISS, Redis failure |
| `tests/test_cache_invalidation.py` | POST /internal/cache/invalidate: auth, keys deleted, Redis unavailability |

## What the cache tests verify

All cache tests mock at the `cache_get` / `cache_set` function level — they do not require a running Redis instance. This means:

- **HIT path**: mock `cache_get` to return a value → assert DB is not called
- **MISS path**: mock `cache_get` to return `None` → assert DB is called and `cache_set` is called with the correct key
- **Redis failure**: mock `cache_get` / `cache_set` to raise → assert tool still succeeds using DB
- **Scope enforcement**: pass a `studentId` that differs from `ctx.student_id` → assert `cache_get` is never called and result is failure

## Running with real Redis (integration)

To test against a real Redis instance:

```bash
REDIS_URL=redis://localhost:6379/0 pytest tests/ -v
```

The tests will still use mocks, but the test for `/health` will reflect a real Redis connection.

To run a quick integration smoke test:

```bash
# Start Redis
docker run -p 6379:6379 redis:7-alpine

# Start the AI service
cd ai-service
uvicorn app.main:app --reload

# Check health
curl http://localhost:8000/health
# Expect: "redis_cache": "connected"
```
