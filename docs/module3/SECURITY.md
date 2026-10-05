# Module 3 — Security

## Role-based access control

Module 3 routes are protected by JWT authentication. Roles and their access:

| Role | Access |
|---|---|
| STUDENT | Own performance data, own learning plans, own agent runs |
| FACULTY_MENTOR | Any student's data within their batches |
| PROGRAM_ADMIN | Any student's data within their program |
| TRAINER | Read access to performance data |
| PLACEMENT_COORDINATOR | Read access to performance data |

## Student scope enforcement

Scope is enforced at two layers:

**1. API layer (Node.js):** `assertStudentScope(req, studentId)` — verifies the JWT's student_id matches the requested studentId (for STUDENT role) or that the requestor has an elevated role.

**2. Tool layer (Python):** Each specialist tool checks `args.student_id == ctx.student_id` before executing. This prevents a compromised agent prompt from extracting another student's data by passing a different studentId argument. Returns `ToolResult(success=False)` on mismatch without hitting the database.

## Internal API key

The `POST /internal/cache/invalidate` endpoint is protected by `X-Internal-Key: <INTERNAL_API_KEY>`. This secret is shared between Node.js (`AI_INTERNAL_KEY`) and the Python service (`INTERNAL_API_KEY`). Both values must match. Change from the default `change-me` before any non-local deployment.

## Secret management

- Never commit `.env` files.
- `LLM_API_KEY` (Groq/Anthropic/OpenAI key) — store in secrets manager in production.
- `JWT_SECRET` — must be at least 32 characters; rotate periodically.
- `INTERNAL_API_KEY` / `AI_INTERNAL_KEY` — change from default in all environments.

## Log safety

Student UUIDs do not appear in log lines. The `_key_category()` helper in `cache_service.py` strips UUIDs from Redis key strings before logging. Cache invalidation logs use `student_id=<redacted>`.

## Redis security

- Use a password-protected Redis instance in production (`redis://:password@host:6379/0`).
- Redis should be on a private network not reachable from the public internet.
- If Redis is unavailable or the password is wrong, Module 3 degrades to PostgreSQL-only — no data is lost.
