# Logging, Monitoring & Error Handling Strategy

> **Source of truth:** `backend/src/shared/errors/AppError.ts`, `backend/src/shared/helpers/response.ts`, `backend/src/index.ts`, `backend/src/routes/`  
> **Branch:** `feature/new-ui-backend-integration`  
> **Audited:** 2026-09-28

---

## Table of Contents

1. [Error Handling Architecture](#1-error-handling-architecture)
2. [AppError Class](#2-apperror-class)
3. [HTTP Error Codes](#3-http-error-codes)
4. [Request Logging](#4-request-logging)
5. [Audit Logging](#5-audit-logging)
6. [AI Service Error Handling](#6-ai-service-error-handling)
7. [Redis Error Handling](#7-redis-error-handling)
8. [Database Error Handling](#8-database-error-handling)
9. [Health Check](#9-health-check)
10. [Observability Gaps](#10-observability-gaps)

---

## 1. Error Handling Architecture

```
Route handler throws → Express errorHandler middleware → sendError(res, error)
                                                             │
                                          ┌──────────────────┴───────────────────┐
                                          │                                       │
                               AppError (known)                        Generic Error (unknown)
                               → HTTP status from error                → 500 INTERNAL_SERVER_ERROR
                               → error.code as JSON code               → "Something went wrong"
```

Every route handler is an `async` function. Unhandled promise rejections bubble to the global Express `errorHandler`. Route handlers also catch errors inline for graceful degradation (e.g., AI service unreachable).

**Response envelopes:**
```typescript
// Success
sendSuccess(res, data, statusCode = 200)
// → { data: <payload> }

// Error
sendError(res, error)
// → { error: { code: string, message: string } }
```

---

## 2. AppError Class

**File:** `backend/src/shared/errors/AppError.ts`

```typescript
class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  )
}
```

Usage: `throw new AppError(402, 'Insufficient credits', 'INSUFFICIENT_CREDITS')`

The `code` field is a machine-readable SCREAMING_SNAKE_CASE string returned in the error envelope. Frontend can check it programmatically.

**Common error codes used in routes:**

| Code | HTTP | Where |
|------|------|-------|
| `INVALID_CREDENTIALS` | 401 | auth.routes.ts login |
| `TOKEN_REQUIRED` | 401 | authenticate middleware |
| `TOKEN_EXPIRED` | 401 | authenticate middleware |
| `TOKEN_INVALID` | 401 | authenticate middleware |
| `TOKEN_REVOKED` | 401 | authenticate middleware |
| `ACCOUNT_SUSPENDED` | 403 | authenticate middleware |
| `FORBIDDEN` | 403 | requireRole, scope guards |
| `INSUFFICIENT_CREDITS` | 402 | CreditService.consume() |
| `ATTEMPT_IN_PROGRESS` | 409 | attempts.routes |
| `NO_RESPONSES` | 422 | sessions.routes complete |
| `AI_UNAVAILABLE` | 503 | responses.routes (text path) |
| `NO_MENTOR_ASSIGNED` | 422 | verifications.routes |

---

## 3. HTTP Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request (malformed UUID, missing required param) |
| 401 | Unauthenticated |
| 402 | Insufficient credits |
| 403 | Forbidden (wrong role, out-of-scope access) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, attempt already in-progress) |
| 422 | Validation error (Zod parse failure, business rule failure) |
| 503 | AI service unavailable |
| 500 | Unhandled server error |

---

## 4. Request Logging

**Library:** `morgan` middleware  
**Format:** `'dev'` in development (colored output with status code, response time)  
**Applied:** In `backend/src/app.ts` before routes

Morgan logs to stdout. Log format: `METHOD /path HTTP/1.1 STATUS - Xms`

**No structured logging** — all logs are plain text to stdout. No log levels, no JSON output, no log aggregation configured.

---

## 5. Audit Logging

**Table:** `system.audit_logs`  
**Populated by:** `USER_REGISTERED` event handler in `backend/src/index.ts`

When a new student registers (via direct registration or CSV import), an audit log row is inserted:
```sql
INSERT INTO system.audit_logs (user_id, action, metadata, created_at)
VALUES ($userId, 'USER_REGISTERED', $metadata, now())
```

**Proctoring audit:** Tab switch events are recorded in `session.assessment_sessions.state_data JSONB` (tab_switch_count field), not in system.audit_logs.

**No other audit events** — login, logout, role changes, credit transactions, verification approvals are not written to audit_logs.

---

## 6. AI Service Error Handling

Two distinct patterns depending on which path is used:

### Text Evaluation Path (responses.routes.ts via ai-client.ts)

```
FastAPI timeout or error
  → ai-client catches error
  → route writes evaluation.ai_runs with status='PENDING'
  → returns HTTP 503 AI_UNAVAILABLE to client
  → client must retry
```

### Audio Evaluation Path (interview.routes.ts)

```
FastAPI timeout or error (60s timeout)
  → axios error caught inline
  → scores set to 0 (technicalScore: 0, communicationScore: 0, overallScore: 0)
  → aiReachable: false added to response
  → HTTP 200 returned with zero scores
  → client warned but session continues
```

The audio path degrades gracefully (session continues with zero scores) while the text path returns a hard error (503). This asymmetry is intentional — audio sessions tolerate AI unavailability; text sessions do not.

---

## 7. Redis Error Handling

`SessionContextService` handles Redis unavailability at every operation:

- `appendTurn()`: Redis error → logs warning; returns without throwing; turn context lost for this session
- `flushToDb()`: Redis error → logs warning; flush skipped; no panic (DB write fails silently)
- `getTurns()`: Redis error → returns `[]` (empty array); AI evaluation proceeds without conversation context

**Effect:** Redis unavailability degrades audio interview quality (no conversation context for LLM) but does not crash the server or block the request.

---

## 8. Database Error Handling

**PG error 23505** (unique constraint violation) → caught in auth and programs routes → returns 409 CONFLICT

**PG error 22P02** (invalid UUID format) → falls through to 500 in most routes (not explicitly caught); handled at route level in sessions routes (UUID guard prevents routing to `/:id` for non-UUIDs like "bank-fallback")

**Uncaught DB errors** → propagate to Express errorHandler → 500 INTERNAL_SERVER_ERROR

**Transaction failures** → `ROLLBACK` via `try/finally` pattern in routes using explicit transactions

---

## 9. Health Check

**Endpoint:** `GET /api/health`  
**Auth:** None  
**Response 200:**
```json
{ "data": { "status": "ok", "timestamp": "ISO string" } }
```

No dependency checks — does not verify DB connectivity, Redis, or AI service. Returns 200 as long as the Express process is running.

---

## 10. Observability Gaps

The following monitoring and observability features are **not currently implemented**:

| Gap | Description | Impact |
|----|------------|--------|
| No structured logging | Morgan plain text only; no JSON logs; no log levels | Cannot parse logs programmatically or use log aggregation (Datadog, Logtail, etc.) |
| No distributed tracing | No request IDs, no correlation IDs, no trace spans | Cannot trace a request across backend + AI service |
| No metrics | No Prometheus metrics, no response time tracking, no error rate counters | Cannot set up dashboards or alerts |
| No health dependency check | `GET /health` only checks Express is alive; does not check DB, Redis, or AI | Cannot detect silent dependency failures |
| Minimal audit log | Only USER_REGISTERED events written to `system.audit_logs` | Login/logout, role changes, credit adjustments not audited |
| No alert on AI unavailability | Audio path returns 200 with zero scores silently | Instructors don't know if AI was down during an exam session |
| No session replay | No recording of which questions were served per attempt | Difficult to investigate complaints about wrong questions |
| No event bus monitoring | In-process EventEmitter — events lost on server crash | ATTEMPT_COMPLETED events not re-fired if server restarts mid-session |
| No Redis key expiry monitoring | SESSION_TTL = 7200s; no alert when turns evicted early | Interview context lost silently if Redis TTL expires before flush |
