# Module 3 — Changelog

## [1.1.0] — 2026-09-28

### Added
- Redis read-through cache for GetStudentPerformance, GetSkillGapAnalysis, and RetrieveLearningKnowledge tools
- `ai-service/app/cache/` package: `redis_client.py`, `cache_keys.py`, `cache_service.py`
- `POST /internal/cache/invalidate` endpoint (X-Internal-Key authentication)
- Cache invalidation from Node.js after ATTEMPT_COMPLETED transaction commits (fire-and-forget)
- `AI_INTERNAL_KEY` env variable in Node.js backend
- Redis health status in `GET /health` response
- 4 Python test files covering cache HIT, MISS, Redis failure, student isolation, scope enforcement, and invalidation endpoint
- 12 documentation files in `docs/module3/`

### Changed
- DraftLearningPlan token optimisation: caps `weakSkills` at 5, trims performance data to 5 fields for LLM prompt
- `requirements.txt`: added `redis>=5.0.0`
- `ai-service/.env.example`: added Redis and internal key settings
- `backend/.env.example`: added `AI_INTERNAL_KEY`

### Not changed
- Module 1, Module 2 — untouched
- PostgreSQL schema — no new migrations
- Agent architecture — untouched
- Existing Node.js and Python test files — preserved

## [1.0.0] — (prior)

Initial Module 3 implementation:
- Supervisor + Specialist two-agent architecture
- Four specialist tools
- USER_REGISTERED and ATTEMPT_COMPLETED event handlers
- Performance profiles, snapshots, skill_performances tables
- Learning plans, recommendations, knowledge documents
- Agent run lifecycle (QUEUED → RUNNING → SUCCEEDED/FAILED/DEAD)
