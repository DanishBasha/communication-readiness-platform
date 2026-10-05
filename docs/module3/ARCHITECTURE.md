# Module 3 — Architecture

## Component map

```
Browser / Postman
        │
        ▼
Node.js Express (port 5000)
  ├── POST /learning/agent/run        ─► Python FastAPI (port 8000)
  ├── GET  /learning/agent/run/:id    ─► Python FastAPI
  ├── GET  /learning/plans/:studentId ─► PostgreSQL
  └── GET  /performance/:studentId   ─► PostgreSQL
        │
        │  Internal HTTP (fire-and-forget)
        ▼
Python FastAPI (port 8000)
  ├── POST /agent/run          — creates QUEUED run, schedules BackgroundTask
  ├── GET  /agent/run/{id}     — poll run status
  ├── POST /internal/cache/invalidate  — cache invalidation (X-Internal-Key auth)
  └── GET  /health             — includes redis_cache status
        │
        ├── Supervisor Agent
        │     └── Specialist Agent
        │           └── Agent Loop (LLM ↔ Tools)
        │                 ├── GetStudentPerformance  ─► Redis → PostgreSQL
        │                 ├── GetSkillGapAnalysis   ─► Redis → PostgreSQL
        │                 ├── RetrieveLearningKnowledge ─► Redis → PostgreSQL
        │                 └── DraftLearningPlan     ─► LLM (never cached)
        │
        ├── PostgreSQL (source of truth)
        └── Redis (read-through cache — optional, graceful degradation)
```

## Technology choices

| Layer | Technology | Reason |
|---|---|---|
| Backend API | Node.js + Express + TypeScript | Matches rest of platform |
| AI service | Python FastAPI + uvicorn | Async-friendly, matches LLM SDKs |
| Database | PostgreSQL (pg pool) | ACID, JSONB for flexible scores |
| Cache | Redis 7 | Low-latency read-through; optional |
| Background tasks | FastAPI BackgroundTasks | Keeps it in-process; no extra broker |
| LLM | Groq (default), Anthropic, OpenAI-compat | Pluggable via `LLM_PROVIDER` env |
| Events | Node.js EventEmitter (in-process) | No external broker needed at this scale |

## Key design decisions

**No Redis in Node.js.** Redis is used only inside the Python service. Cache invalidation is handled via HTTP (`POST /internal/cache/invalidate`) to keep Redis as a Python-only concern.

**PostgreSQL is always source of truth.** Redis stores serialised copies of query results with TTLs. If Redis is unavailable, every tool falls back to PostgreSQL without error.

**BackgroundTasks over Celery/RQ.** The agent run is triggered in-process. This avoids a message broker dependency and is sufficient for the current workload.
