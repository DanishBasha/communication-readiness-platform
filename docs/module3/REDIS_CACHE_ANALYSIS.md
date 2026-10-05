# Module 3 — Redis Cache Analysis

## Why caching was added

The Specialist Agent may call GetStudentPerformance, GetSkillGapAnalysis, and RetrieveLearningKnowledge multiple times within a single agent loop run (up to 12 steps). Without a cache, each tool call hits PostgreSQL with identical queries for the same student in the same run. During a batch scenario (many students running agents simultaneously), this produces significant read pressure on the database.

## What was measured (design time)

The four specialist tools were analysed for cacheability:

| Tool | Cacheable? | Reason |
|---|---|---|
| GetStudentPerformance | Yes | Result is stable within a single assessment cycle; changes only on ATTEMPT_COMPLETED |
| GetSkillGapAnalysis | Yes | Derived from performance_profiles; changes only on ATTEMPT_COMPLETED |
| RetrieveLearningKnowledge | Yes | Public knowledge documents change only when an admin adds/removes content |
| DraftLearningPlan | No | Output is LLM-generated and personalised per run; caching would serve stale plans |

## What data changes and when

| Data | Changed by | Cache action |
|---|---|---|
| performance_profiles | ATTEMPT_COMPLETED event | Invalidate on COMMIT |
| skill_performances | ATTEMPT_COMPLETED event | Invalidate on COMMIT |
| knowledge_documents | Admin creates/deletes document | TTL expiry (no active invalidation needed) |
| learning_plans | Each agent run | Never cached |

## Graceful degradation guarantee

Redis is never a hard dependency. If `REDIS_URL` is empty or Redis is unreachable:
- `get_redis()` returns `None`
- All `cache_get` / `cache_set` calls return early without error
- Tools fall through to PostgreSQL as if the cache did not exist

This means a Redis outage causes a temporary performance regression (extra DB reads) but never an availability outage.
