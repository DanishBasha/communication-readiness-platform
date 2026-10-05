# Module 3 — Learning Readiness Agent

The Learning Readiness Agent analyses each student's assessment history to produce personalised learning plans and skill-gap recommendations.

## Quick navigation

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Component map, technology choices, data flow |
| [AGENT_FLOW.md](AGENT_FLOW.md) | Supervisor → Specialist agent loop, step-by-step |
| [API.md](API.md) | All HTTP endpoints, request/response shapes |
| [DATABASE.md](DATABASE.md) | Schema tables, relationships, migration list |
| [REDIS_CACHE_ANALYSIS.md](REDIS_CACHE_ANALYSIS.md) | Why caching was added, what was measured |
| [REDIS_CACHE_DESIGN.md](REDIS_CACHE_DESIGN.md) | Cache key design, TTLs, invalidation strategy |
| [SECURITY.md](SECURITY.md) | RBAC, scope enforcement, secrets |
| [TESTING.md](TESTING.md) | How to run all Module 3 tests |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker Compose, environment variables |
| [IMPLEMENTATION_CHANGES.md](IMPLEMENTATION_CHANGES.md) | Before/after file list for the Redis feature |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## One-paragraph summary

Module 3 listens for two platform events: **USER_REGISTERED** (creates a blank performance profile) and **ATTEMPT_COMPLETED** (saves a performance snapshot, recalculates running averages and trend, then invalidates the Redis cache). When a user triggers a learning-plan request the Node.js backend calls the Python FastAPI AI service, which creates a QUEUED agent run and executes it asynchronously via FastAPI's `BackgroundTasks`. The Supervisor Agent orchestrates a four-step flow; the Specialist Agent runs an iterative LLM tool loop (max 12 steps) that calls four tools: GetStudentPerformance, GetSkillGapAnalysis, RetrieveLearningKnowledge, and DraftLearningPlan. Redis is a read-through cache in front of PostgreSQL for the first three tools; DraftLearningPlan is never cached because its output is personalised and generated per run.
