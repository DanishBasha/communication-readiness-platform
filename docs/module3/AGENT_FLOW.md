# Module 3 — Agent Flow

## Trigger

A POST to `/learning/agent/run` (Node.js) is proxied to `POST /agent/run` (Python). The Python router creates a QUEUED agent_run row in PostgreSQL, then schedules `execute_agent_run(run_id)` as a FastAPI BackgroundTask and immediately returns `{ run_id, status: "QUEUED" }`.

## Supervisor Agent (4 steps)

```
Step 1 — START
  Read agent_run row; build GoalContext from metadata.

Step 2 — GetStudentPerformance (direct call, not via Specialist)
  Call performance_repository.get_performance_profile(student_id).
  If no profile found → update run to FAILED, return.

Step 3 — DELEGATE
  Create a child agent_run for the Specialist Agent.
  Call run_agent_loop(specialist_config) — blocks until complete.

Step 4 — PERSIST_PLAN
  Read learning_plan drafted by Specialist.
  INSERT into learning_plans (idempotent: skip if run_id already has a plan).
  UPDATE supervisor agent_run to SUCCEEDED.
```

## Specialist Agent — Agent Loop

Config: `max_steps=12`, `max_tool_calls=8`, `timeout=45s`

The loop calls the LLM with the system prompt and current message history. The LLM may respond with:
- A tool call → execute tool, append result to history, loop again.
- A text response with no tool call → terminate (NATURAL_STOP).

Termination also occurs on: max_steps exceeded (MAX_STEPS), max_tool_calls exceeded (MAX_TOOL_CALLS), timeout (TIMEOUT), or unhandled exception (ERROR).

```
SPECIALIST_TOOLS = [
  GetStudentPerformance,     ← Redis → PostgreSQL
  GetSkillGapAnalysis,       ← Redis → PostgreSQL
  RetrieveLearningKnowledge, ← Redis → PostgreSQL
  DraftLearningPlan,         ← LLM generation, never cached
]
```

### Tool execution with cache

```
GetStudentPerformance.execute(args, ctx):
  1. Scope check: args.studentId must equal ctx.student_id → 403 if mismatch
  2. key = "module3:v1:performance:{student_id}"
  3. cached = cache_get(key)
  4. if cached: return ToolResult(success=True, data=cached)
  5. profile = performance_repository.get_performance_profile(student_id)
  6. if not profile: return ToolResult(success=False, ...)
  7. snapshots = performance_repository.get_recent_snapshots(student_id, limit=5)
  8. data = { profile, recentSnapshots: snapshots }
  9. cache_set(key, data, ttl=600)
  10. return ToolResult(success=True, data=data)
```

GetSkillGapAnalysis and RetrieveLearningKnowledge follow the same pattern with their own keys and TTLs.

## Agent run status machine

```
QUEUED → RUNNING (CAS: compare-and-swap atomically)
RUNNING → SUCCEEDED
RUNNING → FAILED
RUNNING → DEAD (crash recovery on startup)
```

Crash recovery: `recover_dead_runs()` is called at startup; it marks any run still RUNNING (from a previous process crash) as DEAD.

## Idempotency guarantees

- `performance_profiles`: `INSERT ... ON CONFLICT (student_id) DO NOTHING`
- `performance_snapshots`: checked by `(student_id, attempt_id)` before INSERT
- `learning_plans`: checked by `run_id` before INSERT
- Agent run status: CAS prevents two workers from both transitioning QUEUED→RUNNING
