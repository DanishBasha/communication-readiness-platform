# Node.js Agent Cleanup — Change Log

## What Was Done

Removed the old Node.js agent implementation from the backend.
The agent system has moved to the Python FastAPI service (ai-service).
The Node.js backend no longer runs the agent — it only triggers and monitors it.

---

## Files Deleted

| File | What it was |
|------|-------------|
| `src/agents/agentLoop.ts` | The main agent loop — made LLM calls, executed tools, persisted steps |
| `src/agents/supervisorAgent.ts` | The supervisor agent — coordinated the specialist, persisted the learning plan |
| `src/agents/specialistAgent.ts` | The specialist agent — created sub-runs, called the agent loop |
| `src/agents/tools.ts` | Four tool implementations (GetStudentPerformance, GetSkillGapAnalysis, RetrieveLearningKnowledge, DraftLearningPlan) |

---

## Files Modified

### `src/agents/agentRunner.ts`
- **Removed:** `executeAgentRun()` function — was the Node.js entry point for running an agent
- **Removed:** `import { runSupervisorAgent } from './supervisorAgent'` — no longer needed
- **Kept:** `recoverDeadRuns()` — still needed at startup to mark timed-out RUNNING runs as DEAD in PostgreSQL

### `src/__tests__/module3/agent.test.ts`
- **Removed:** imports of `runAgentLoop`, `SPECIALIST_TOOLS`, `executeAgentRun` (deleted code)
- **Removed:** Tests 2–5, 7–11, 13–16 — these tested the old Node.js agent internals directly
- **Removed:** second sub-tests in Tests 6 and 12 — those also tested old agent internals
- **Removed:** fixtures and helpers only used by old tests (SUPERVISOR_DEF, PERF_PROFILE, setupHappyAxios, etc.)
- **Kept:** Tests 1, 6 (first sub-test), 12 (first sub-test), 17, 18 — these test the API layer which is still in Node.js

### `src/__tests__/module3/e2e.test.ts`
- **Removed:** Section 7 "Supervisor delegates to Specialist" — dynamically imported `runSpecialistAgent` which no longer exists
- **Removed:** `jest.mock('axios', ...)` that was only there for section 7
- **Kept:** All other sections (1–6, 7 renumbered from 8) — these test the event handlers, API endpoints, and `recoverDeadRuns` which are all still in Node.js

---

## Files NOT Changed

| File | Why kept as-is |
|------|----------------|
| `src/shared/events/module3Handlers.ts` | Handles ATTEMPT_COMPLETED — updates performance data, invalidates cache, triggers FastAPI `/agent/run`. This is the bridge between Node.js and the Python agent. |
| `src/routes/learning.routes.ts` | POST `/agent/run` delegates to Python. GET endpoints read from the shared database. All still required. |
| `src/index.ts` | Still calls `recoverDeadRuns()` at startup. Import unchanged. |

---

## Why This Was Done

Before this change, Node.js had a full duplicate implementation of the agent system:
- Its own LLM call loop
- Its own supervisor and specialist agents
- Its own tool implementations (querying PostgreSQL directly)
- Its own learning plan generation

All of that logic has been rebuilt in the Python FastAPI service (ai-service), which is now the source of truth for agent execution. The Python service uses Redis/RQ for async job processing, has its own supervisor/specialist/loop, and writes results to PostgreSQL.

Keeping the Node.js implementation alongside the Python one meant:
- Dead code that could never be called (module3Handlers.ts already calls FastAPI directly)
- Confusion about which implementation is active
- Maintenance burden — any bug fix or change would need to be made in two places

---

## What the Flow Looks Like Now

```
ATTEMPT_COMPLETED event
        |
        v
module3Handlers.handleAttemptCompleted()
        |
        |-- invalidateStudentCache()  -->  FastAPI POST /internal/cache/invalidate
        |
        +-- triggerModule3Agent()     -->  FastAPI POST /agent/run
                                                |
                                           Redis / RQ
                                                |
                                          Python worker
                                                |
                                       agent_runner.execute_agent_run()
                                                |
                                    Supervisor -> Specialist -> Agent Loop
                                                |
                                         Tools + LLM
                                                |
                                    4-week learning plan -> PostgreSQL
                                                |
                                  Node.js GET /learning/plans/:studentId
                                  Node.js GET /learning/agent/run/:runId
```

Nothing in this flow changed. Only the dead Node.js agent code was removed.
