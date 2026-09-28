# API Function Catalog
> **Source of truth:** actual backend source files as of 2026-09-28  
> **Branch:** `feature/module-2-live-integration`  
> **Compiler status:** `tsc --noEmit` → 0 errors (after 2026-09-28 fixes)  
> **Live HTTP test date:** 2026-09-28 — see `docs/API_TEST_REPORT.md` for full results  
> **DO NOT** treat `API_REFERENCE.md` as ground truth — this document is audited from code.

### Live Test Summary (2026-09-28)
- **Bugs fixed:** 3 (bank-fallback UUID routing, credits balance SQL, idempotency key overflow)
- **PASS:** 50/55 tested endpoints  
- **BLOCKED:** 4 (AI service not running; responses/submit requires session flow)  
- **NOT_IMPLEMENTED:** 7 (M3, portal stubs)  
- **TypeScript:** PASS | **Unit tests:** 42/42 PASS  
- **M2→M4 integration:** PASS (credit consume/earn/report/eligibility verified in live DB)

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `IMPLEMENTED_AND_USED` | Route exists, middleware wired, registered in `routes/index.ts`, callable |
| `IMPLEMENTED_BUT_NOT_CURRENTLY_USED` | Route exists and compiles but not actively called by any client/test |
| `DOCUMENTED_BUT_NOT_IMPLEMENTED` | Appears in checklist/docs but no handler exists in source |
| `BLOCKED` | Blocked by a missing dependency from another module |
| `STUB` | Skeleton exists; returns empty or placeholder response |

---

## Table of Contents

1. [Shared API / Function Inventory](#1-shared-api--function-inventory)
2. [M1 — Auth & Identity](#2-m1--auth--identity)
3. [M2 — Assessments, Sessions, AI Evaluation](#3-m2--assessments-sessions-ai-evaluation)
4. [M4 — Credits, Checklist, Placement](#4-m4--credits-checklist-placement)
5. [FastAPI AI Service](#5-fastapi-ai-service)
6. [Event Bus Contracts](#6-event-bus-contracts)
7. [Cross-Module Dependency Map](#7-cross-module-dependency-map)
8. [Documented but Not Implemented](#8-documented-but-not-implemented)
9. [Implemented but Not Currently Used](#9-implemented-but-not-currently-used)
10. [Blocked / Waiting on Another Module](#10-blocked--waiting-on-another-module)

---

## 1. Shared API / Function Inventory

Functions genuinely used by two or more modules. Not shared just because they appear in docs.

### 1.1 `authenticate` middleware
- **File:** `backend/src/middleware/authenticate.ts`
- **Used by:** ALL modules — every protected route
- **What it does:** Validates JWT from `Authorization: Bearer <token>`, populates `req.user` with `{ id, email, role, name, tokenVersion }`
- **Token version check:** Compares JWT `tokenVersion` against `identity.users.token_version` to detect post-logout token reuse
- **Status:** `IMPLEMENTED_AND_USED`

### 1.2 `requireRole(...roles)` middleware
- **File:** `backend/src/middleware/authorize.ts`
- **Used by:** M2, M4, auth routes
- **What it does:** Asserts `req.user.role` is one of the listed roles; throws `AppError(403, FORBIDDEN)` otherwise
- **Status:** `IMPLEMENTED_AND_USED`

### 1.3 `requireStudentSelfOrStaff` middleware
- **File:** `backend/src/middleware/authorize.ts`
- **Used by:** `student.routes.ts`
- **What it does:** Allows STUDENT to access own record, allows FACULTY_MENTOR / PROGRAM_ADMIN / TRAINER through unconditionally
- **Status:** `IMPLEMENTED_AND_USED`

### 1.4 `AppError`
- **File:** `backend/src/shared/errors/AppError.ts`
- **Used by:** All modules
- **Interface:** `new AppError(httpStatus, message, code)` — `code` is a machine-readable string (e.g. `INSUFFICIENT_CREDITS`)
- **Status:** `IMPLEMENTED_AND_USED`

### 1.5 `sendSuccess` / `sendError`
- **File:** `backend/src/shared/helpers/response.ts`
- **Used by:** All modules
- **Response envelope:** `{ data: <payload> }` for success; `{ error: { code, message } }` for errors
- **Status:** `IMPLEMENTED_AND_USED`

### 1.6 `db` pool
- **File:** `backend/src/shared/db/pool.ts`
- **Used by:** All modules
- **What it does:** Exports `pg.Pool` connected to `DATABASE_URL`; supports `db.query()` and `db.connect()` for manual transactions
- **Status:** `IMPLEMENTED_AND_USED`

### 1.7 `eventBus`
- **File:** `backend/src/shared/events/eventBus.ts`
- **Used by:** M1 (emit USER_REGISTERED), M2 (emit ATTEMPT_COMPLETED), M4 (listen + emit)
- **What it does:** Node.js `EventEmitter` wrapper with typed `emit` and `on` methods
- **Status:** `IMPLEMENTED_AND_USED`

### 1.8 `CreditService`
- **File:** `backend/src/modules/credits/credits.service.ts`
- **Used by:** M2 (`attempts.routes.ts`), M4 event handler (`event-handlers.ts`)
- **Methods:** `static consume()`, `static earn()`, `static createAccount()`
- **Status:** `IMPLEMENTED_AND_USED`
- **Note:** `credits.service.stub.ts` is now a re-export shim; the real implementation is always used

### 1.9 `EligibilityService`
- **File:** `backend/src/modules/placement/eligibility.service.ts`
- **Used by:** M4 event handler, `verifications.routes.ts`
- **Methods:** `static recalculate(studentId)`
- **Status:** `IMPLEMENTED_AND_USED` — but returns 0 performance score until M3 seeds `performance.performance_profiles`

---

## 2. M1 — Auth & Identity

M1 routes are in `backend/src/routes/auth.routes.ts`, `student.routes.ts`, `org.routes.ts`, `mentor.routes.ts`, `trainer.routes.ts`, `admin.routes.ts`, `portal.routes.ts`.

---

### POST `/api/auth/register`
| Field | Value |
|-------|-------|
| **File** | `src/routes/auth.routes.ts:42` |
| **Auth** | None (public) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ name, email, password, rollNumber, batchId, subdivisionId? }` |
| **Response 201** | `{ data: { token, user: { id, name, email, role }, studentId } }` |
| **Response 409** | Duplicate email / roll number |
| **Response 422** | Validation error |
| **DB tables** | `identity.users` (INSERT), `org.students` (INSERT) |
| **Event emitted** | `USER_REGISTERED` with `{ userId, studentId, email, name }` |
| **Side effects** | M4 handler creates `credit.credit_accounts` row; audit log written |

### POST `/api/auth/login`
| Field | Value |
|-------|-------|
| **File** | `src/routes/auth.routes.ts:107` |
| **Auth** | None (public) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ email, password }` |
| **Response 200** | `{ data: { token, user: { id, name, email, role }, studentId } }` |
| **Response 401** | Invalid credentials |
| **Security note** | Constant-time comparison via dummy hash prevents user enumeration timing attacks |

### POST `/api/auth/logout`
| Field | Value |
|-------|-------|
| **File** | `src/routes/auth.routes.ts:165` |
| **Auth** | Required |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Increments `identity.users.token_version` — invalidates all outstanding JWTs for user |

### GET `/api/auth/me`
| Field | Value |
|-------|-------|
| **File** | `src/routes/auth.routes.ts:179` |
| **Auth** | Required |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { user: { id, name, email, role }, studentId } }` |

### GET `/api/students/:studentId`
| Field | Value |
|-------|-------|
| **File** | `src/routes/student.routes.ts` |
| **Auth** | Required; student sees own only; staff sees all |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { id, roll_number, batch_id, subdivision_id, resume_url, user: {...} } }` |

### POST `/api/students/:studentId/resume`
| Field | Value |
|-------|-------|
| **File** | `src/routes/student.routes.ts` |
| **Auth** | Required; STUDENT own only |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `multipart/form-data` with `resume` file |
| **Effect** | Stores file; updates `org.students.resume_url` |

### GET `/api/org/institutions`, GET `/api/org/programs`, GET `/api/org/batches`, GET `/api/org/subdivisions`
| Field | Value |
|-------|-------|
| **File** | `src/routes/org.routes.ts` |
| **Auth** | Public (used on registration form) |
| **Status** | `IMPLEMENTED_AND_USED` |

### GET `/api/mentors/*`, GET `/api/trainers/*`, GET `/api/admin/*`
| Field | Value |
|-------|-------|
| **File** | `src/routes/mentor.routes.ts`, `trainer.routes.ts`, `admin.routes.ts` |
| **Auth** | Required; role-specific |
| **Status** | `IMPLEMENTED_AND_USED` (scope limited to basic CRUD) |

---

## 3. M2 — Assessments, Sessions, AI Evaluation

---

### GET `/api/assessments`
| Field | Value |
|-------|-------|
| **File** | `src/modules/assessments/assessments.routes.ts` |
| **Auth** | Required |
| **Roles** | Any authenticated user |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { assessments: [{ id, name, assessment_type, interview_type, version, description, is_active, created_at }] } }` |
| **Filter** | Only `is_active = true` rows returned |
| **DB** | `assessment.assessments` |

### POST `/api/assessments`
| Field | Value |
|-------|-------|
| **File** | `src/modules/assessments/assessments.routes.ts` |
| **Auth** | Required |
| **Roles** | PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ name, assessmentType: "MOCK_INTERVIEW"|"LISTENING_COMPREHENSION", interviewType?, description? }` |
| **Response 201** | `{ data: { assessment: { id, name, assessment_type, ... } } }` |
| **DB** | INSERT `assessment.assessments` |

### GET `/api/assessments/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/assessments/assessments.routes.ts` |
| **Auth** | Required |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | Single assessment + component array |
| **DB** | `assessment.assessments` JOIN `assessment.assessment_components` |

### PUT `/api/assessments/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/assessments/assessments.routes.ts` |
| **Auth** | Required |
| **Roles** | PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ name?, interviewType?, description?, isActive? }` |

---

### GET `/api/question-bank`
| Field | Value |
|-------|-------|
| **File** | `src/modules/question-bank/question-bank.routes.ts` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { questions: [{ id, question_text, difficulty, metadata, skill_ids, is_active }] } }` |
| **DB** | `session.question_bank_items` LEFT JOIN `session.question_bank_item_skills` |

### POST `/api/question-bank`
| Field | Value |
|-------|-------|
| **File** | `src/modules/question-bank/question-bank.routes.ts` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ questionText, difficulty: "EASY"|"MEDIUM"|"ADVANCED", evaluationCriteria?, metadata?, skillIds?, isPrimary? }` |
| **DB** | INSERT `session.question_bank_items` + optional `session.question_bank_item_skills` rows |

### PUT `/api/question-bank/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/question-bank/question-bank.routes.ts` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN |
| **Status** | `IMPLEMENTED_AND_USED` |

### DELETE `/api/question-bank/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/question-bank/question-bank.routes.ts` |
| **Auth** | Required |
| **Roles** | PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Soft-delete: sets `is_active = false` |

---

### POST `/api/attempts/start`
| Field | Value |
|-------|-------|
| **File** | `src/modules/attempts/attempts.routes.ts:17` |
| **Auth** | Required |
| **Roles** | STUDENT |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ assessmentId: uuid }` |
| **Response 201** | `{ data: { attemptId, status: "IN_PROGRESS", creditBalance } }` |
| **Response 402** | `INSUFFICIENT_CREDITS` — from `CreditService.consume()` |
| **Response 409** | `ATTEMPT_IN_PROGRESS` — concurrent active attempt exists |
| **Credit flow** | Reads `consume_amount` from global `credit.credit_policies` (defaults to 10); calls `CreditService.consume()` BEFORE creating attempt row |
| **DB** | `org.students`, `assessment.assessments`, `assessment.assessment_attempts` INSERT, `credit.credit_accounts` UPDATE |
| **M4 dependency** | `CreditService.consume()` — IMPLEMENTED |
| **Idempotency** | `CreditService` uses idempotency key `consume:studentId:ASSESSMENT_START:assessmentId` |

### GET `/api/attempts/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/attempts/attempts.routes.ts:99` |
| **Auth** | Required |
| **Roles** | STUDENT (own), FACULTY_MENTOR, PROGRAM_ADMIN (any) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { attempt: { id, assessment_id, student_id, status, interview_type, started_at, ... } } }` |

### PUT `/api/attempts/:id/abandon`
| Field | Value |
|-------|-------|
| **File** | `src/modules/attempts/attempts.routes.ts:133` |
| **Auth** | Required |
| **Roles** | STUDENT (own) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Sets attempt `status = ABANDONED`; terminates any ACTIVE/PAUSED session for that attempt |
| **Note** | No credit refund — by design (no refund policy defined) |

---

### POST `/api/sessions/start`
| Field | Value |
|-------|-------|
| **File** | `src/modules/sessions/sessions.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ attemptId: uuid, sessionType: "MOCK_INTERVIEW"|"LISTENING_COMPREHENSION" }` |
| **Response 201** | `{ data: { sessionId, status: "ACTIVE", firstQuestion: { questionId, questionText, difficulty } } }` |
| **State machine** | Creates session in ACTIVE state; serves first question from bank or AI |
| **DB** | `assessment.assessment_attempts`, `session.assessment_sessions` INSERT, `session.questions` INSERT |

### GET `/api/sessions/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/sessions/sessions.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT (own) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { session: { id, state, tab_switch_count, is_proctor_flagged, ... }, currentQuestion: {...} } }` |

### POST `/api/sessions/:id/proctor-event`
| Field | Value |
|-------|-------|
| **File** | `src/modules/sessions/sessions.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT (own) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ eventType: "TAB_SWITCH"|"FULLSCREEN_EXIT", timestamp }` |
| **Response** | `{ data: { tabSwitchCount, isFlagged, warning? } }` |
| **Proctoring rules** | 1–(threshold-1) → warning; ≥ threshold → `is_proctor_flagged = true`; threshold from `env.MAX_TAB_SWITCH_LIMIT` (default 4) |

### POST `/api/sessions/:id/complete`
| Field | Value |
|-------|-------|
| **File** | `src/modules/sessions/sessions.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT (own) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Aggregates `evaluation.response_evaluations`; computes overall/technical/comm scores; writes immutable `performance.assessment_reports` row; emits `ATTEMPT_COMPLETED` event |
| **Score formula** | `overall = tech_avg × 0.70 + comm_avg × 0.30` |
| **Event emitted** | `ATTEMPT_COMPLETED` with 8-field payload (see §6) |
| **DB** | `session.assessment_sessions` UPDATE, `evaluation.response_evaluations` SELECT, `performance.assessment_reports` INSERT |

---

### GET `/api/sessions/bank-fallback`
| Field | Value |
|-------|-------|
| **File** | `src/routes/interview.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Query params** | `sessionId: uuid`, `difficulty?: EASY|MEDIUM|ADVANCED`, `domain?` |
| **Purpose** | Audio interview clients use this to get a question; inserts a `session.questions` row so audio turns can link to it |
| **DB** | `session.question_bank_items` SELECT, `session.questions` INSERT |
| **B-QBANK-NAME fix** | Uses `session.question_bank_items` (not the incorrect `session.question_bank`) |
| **Redis** | Caches turn context in `sessionContextService` if REDIS_URL is set |

### POST `/api/sessions/:id/turns`
| Field | Value |
|-------|-------|
| **File** | `src/routes/interview.routes.ts` |
| **Auth** | Required — `authenticate` placed BEFORE `audioUpload.single('audio')` |
| **Roles** | STUDENT (own session) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `multipart/form-data` with `audio` file |
| **Effect** | Forwards audio to FastAPI `/ai/evaluate-turn`; writes `evaluation.responses`, `evaluation.ai_runs`, `evaluation.response_evaluations`; optionally writes `session.interview_transcripts` (migration 016) |
| **B-TURNS-NO-AUTH fix** | Session ownership enforced: `session.student_user_id === req.user.id` |
| **B-RESPONSE-SPLIT fix** | Writes to M2 evaluation tables so session completion can aggregate scores |
| **Graceful degradation** | Transcript write wrapped in `.catch()` — degrades if migration 016 not applied |
| **AI dependency** | POST `/ai/evaluate-turn` on FastAPI |

---

### POST `/api/responses/submit`
| Field | Value |
|-------|-------|
| **File** | `src/modules/responses/responses.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ attemptId, questionId, transcript, inputType?: "VOICE"|"TEXT"|"MIXED", durationSec?, idempotencyKey? }` |
| **Response** | `{ data: { evaluationId, technicalScore, communicationScore, feedback, strengths, weaknesses, nextQuestion? } }` |
| **Flow** | Verifies ownership → writes `evaluation.responses` → calls FastAPI `/ai/evaluate-response` → computes scores (Node.js) → writes `evaluation.ai_runs` + `evaluation.response_evaluations` → returns next question |
| **FastAPI down** | Writes `ai_runs` with `status = PENDING`; returns 503 to client |
| **Idempotency** | Client-supplied `idempotencyKey` prevents duplicate scoring on retry |
| **DB** | `evaluation.responses`, `evaluation.ai_runs`, `evaluation.response_evaluations` |
| **AI dependency** | POST `/ai/evaluate-response` on FastAPI |

### GET `/api/responses/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/responses/responses.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT (own), FACULTY_MENTOR (mentee) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | Response + evaluation detail |

---

### GET `/api/reports/:attemptId`
| Field | Value |
|-------|-------|
| **File** | `src/modules/reports/reports.routes.ts` |
| **Auth** | Required |
| **Roles** | STUDENT (own), FACULTY_MENTOR (any mentee), PROGRAM_ADMIN (any) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { attemptId, studentId, overallScore, technicalScore, communicationScore, component_scores, strengths, weaknesses, feedback, sessionType, generatedAt } }` |
| **Access control** | STUDENT guarded: `student.user_id === req.user.id` |
| **DB** | `performance.assessment_reports` JOIN `assessment.assessment_attempts`, `org.students`, `assessment.assessments` |

---

## 4. M4 — Credits, Checklist, Placement

---

### `CreditService.consume(studentId, amount, reason, referenceId)`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credits.service.ts:9` |
| **Called by** | `POST /api/attempts/start` |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Transaction** | `SELECT FOR UPDATE` on `credit.credit_accounts` — prevents double-spend |
| **Idempotency** | Key = `consume:studentId:reason:referenceId`; duplicate calls return cached result |
| **Throws** | `AppError(402, INSUFFICIENT_CREDITS)` if `balance < amount` |
| **Throws** | `AppError(404, NOT_FOUND)` if no credit account |
| **Returns** | `{ newBalance, transactionId }` |
| **DB** | UPDATE `credit.credit_accounts`, INSERT `credit.credit_transactions` |

### `CreditService.earn(studentId, amount, reason, referenceId)`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credits.service.ts:69` |
| **Called by** | M4 `ATTEMPT_COMPLETED` event handler |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Balance cap** | Reads `max_balance` from global `credit.credit_policies`; caps earn at policy max |
| **Idempotency** | Key = `earn:studentId:reason:referenceId`; safe to replay |
| **Returns** | `{ newBalance, transactionId }` |

### `CreditService.createAccount(studentId)`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credits.service.ts:130` |
| **Called by** | M4 `USER_REGISTERED` event handler |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Idempotency** | Checks for existing account; silent no-op on duplicate |
| **Initial balance** | Reads `initial_credit_amount` from global `credit.credit_policies` (default 50) |
| **DB** | INSERT `credit.credit_accounts`, INSERT `credit.credit_transactions` type `INITIAL` |

---

### GET `/api/credits/balance/:studentId`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credits.routes.ts:12` |
| **Auth** | Required |
| **Roles** | STUDENT (own), FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { studentId, balance, accountId, updatedAt, totalEarned, totalConsumed } }` |
| **DB** | `credit.credit_accounts` + aggregate from `credit.credit_transactions` (FILTER by EARN/INITIAL/CONSUME) |
| **Note** | `totalEarned` = sum of EARN+INITIAL transactions; `totalConsumed` = sum of CONSUME transactions; computed live from ledger |

### GET `/api/credits/transactions/:studentId`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credits.routes.ts:49` |
| **Auth** | Required |
| **Roles** | STUDENT (own), PROGRAM_ADMIN |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Query params** | `page`, `limit` (max 100) |
| **Response** | `{ data: { transactions: [...], pagination: { total, page, limit } } }` |
| **DB** | `credit.credit_transactions` |

---

### GET `/api/credit-policies`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credit-policies.routes.ts:12` |
| **Auth** | Required |
| **Roles** | PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | All `credit.credit_policies` rows with config columns |

### POST `/api/credit-policies`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credit-policies.routes.ts:46` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ scopeType, initialCreditAmount, consumeAmount, rewardCeiling, maxBalance?, programId?, subdivisionId?, studentId? }` |
| **Purpose** | Create per-program or per-student policy override on top of GLOBAL_DEFAULT |

### PUT `/api/credit-policies/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/credits/credit-policies.routes.ts:77` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Partial-update any policy column (COALESCE); updates `updated_at` |

---

### GET `/api/checklist`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:14` |
| **Auth** | Required |
| **Roles** | Any authenticated user |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Query params** | `programId?: uuid` — filter by program |
| **Response** | `{ data: { items: [{ id, program_id, name, description, category, max_score, is_required, is_active }] } }` |

### POST `/api/checklist`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:46` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ programId, subdivisionId?, name, description?, category?, maxScore?, weight?, isRequired? }` |
| **Constraint** | `UNIQUE(program_id, name)` enforced at DB level |

### POST `/api/checklist/import-csv`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:72` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | JSON body: `{ programId, subdivisionId?, rows: [{ name, description?, category?, isRequired? }] }` |
| **Note** | Endpoint accepts JSON, not CSV file — differs from M4 checklist spec which described `multipart/form-data CSV`. Actual implementation uses JSON array for simpler integration. |
| **Response** | `{ data: { inserted, total } }` |

### PUT `/api/checklist/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:112` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |

### DELETE `/api/checklist/:id`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:146` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Effect** | Soft-delete: `is_active = false` |

### GET `/api/checklist/my-progress`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:167` |
| **Auth** | Required |
| **Roles** | STUDENT (own, derived from JWT) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { studentId, items: [{ id, name, category, max_score, is_required, status, score, is_mentor_verified, completed_at }] } }` |
| **Note** | `programId` is resolved from student's batch; no path param needed |

### POST `/api/checklist/:itemId/toggle`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:212` |
| **Auth** | Required |
| **Roles** | STUDENT (own) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ status?: "PENDING"|"IN_PROGRESS"|"COMPLETED", completionEvidence?, score? }` |
| **Effect** | UPSERTs `placement.checklist_progress`; emits `CHECKLIST_ITEM_TOGGLED`; calls `EligibilityService.recalculate()` (fire-and-forget) |
| **Note** | Does NOT auto-create mentor_verifications row — `requires_mentor_verification` column does not exist in current `checklist_items` schema. Students use `POST /api/verifications/request` to request mentor sign-off. |

### GET `/api/checklist/mentee/:studentId`
| Field | Value |
|-------|-------|
| **File** | `src/modules/checklist/checklist.routes.ts:266` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Scope guard** | Verifies `org.student_mentor_assignments` — mentor must be assigned to student |

---

### GET `/api/verifications/pending`
| Field | Value |
|-------|-------|
| **File** | `src/modules/verifications/verifications.routes.ts:14` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | Pending verifications for this mentor's assigned students, joined with checklist item and student info |
| **DB** | `placement.mentor_verifications` JOIN `checklist_progress`, `checklist_items`, `org.students`, `identity.users` |

### POST `/api/verifications/request`
| Field | Value |
|-------|-------|
| **File** | `src/modules/verifications/verifications.routes.ts:51` |
| **Auth** | Required |
| **Roles** | STUDENT |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ checklistItemId: uuid }` |
| **Response 201** | `{ data: { verificationId, status: "PENDING", checklistItemId, message } }` |
| **Response 422** | `NO_MENTOR_ASSIGNED` — if student has no active mentor in `org.student_mentor_assignments` |
| **Idempotency** | Re-uses existing PENDING verification if one already exists for same progress+mentor |
| **Effect** | Upserts `placement.checklist_progress` (sets to IN_PROGRESS); creates `mentor_verifications` row with status=PENDING |
| **Scope** | Mentor is resolved automatically from `org.student_mentor_assignments` — student does not specify mentor |

### POST `/api/verifications/:progressId/verify`
| Field | Value |
|-------|-------|
| **File** | `src/modules/verifications/verifications.routes.ts` |
| **Auth** | Required |
| **Roles** | FACULTY_MENTOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Request** | `{ status: "VERIFIED"|"REJECTED", notes? }` |
| **Scope guard** | Checks `org.student_mentor_assignments` — rejects with 403 if mentor not assigned to student |
| **Effect** | Upserts `mentor_verifications` row; if VERIFIED sets `checklist_progress.is_mentor_verified = true`; emits `MENTOR_VERIFIED` event; triggers `EligibilityService.recalculate()` |
| **Event emitted** | `MENTOR_VERIFIED` with payload `{ studentId, mentorId, verifiedAt, checklistItemId, outcome }` |

---

### `EligibilityService.recalculate(studentId)`
| Field | Value |
|-------|-------|
| **File** | `src/modules/placement/eligibility.service.ts:6` |
| **Called by** | M4 `ATTEMPT_COMPLETED` handler, `verifications.routes.ts` on verify action, `checklist.routes.ts` toggle (fire-and-forget) |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Logic** | Counts required items vs mentor-verified items; reads `performance.performance_profiles.overall_score` (M3); reads `credit.credit_accounts.balance`; UPSERTs `placement.placement_eligibility` |
| **Eligibility rules** | All required items mentor-verified AND performance score ≥ 60 AND credit balance > 0 |
| **M3 blocker** | `performance.performance_profiles` is empty until M3 is implemented → `perfScore = 0` → all students fail the 60 threshold |

### GET `/api/placement-eligibility/:studentId`
| Field | Value |
|-------|-------|
| **File** | `src/modules/placement/placement.routes.ts:66` |
| **Auth** | Required |
| **Roles** | STUDENT (own), FACULTY_MENTOR (mentee), PROGRAM_ADMIN, PLACEMENT_COORDINATOR |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Response** | `{ data: { student_id, total_score, maximum_score, threshold_score, is_eligible, blocking_reasons[], reason, evaluated_at } }` |
| **Access control** | Students can only view their own; staff can view any |

### GET `/api/placement-eligibility/report`
| Field | Value |
|-------|-------|
| **File** | `src/modules/placement/placement.routes.ts:12` |
| **Auth** | Required |
| **Roles** | PLACEMENT_COORDINATOR, PROGRAM_ADMIN |
| **Status** | `IMPLEMENTED_AND_USED` |
| **Query params** | `programId?: uuid`, `isEligible?: "true"|"false"`, `page`, `limit` (max 100) |
| **Response** | `{ data: { report: [...], pagination: { total, page, limit } } }` |
| **Note** | Route registered BEFORE `/:studentId` to prevent path shadowing |

---

## 5. FastAPI AI Service

> **Location:** `ai-service/` directory  
> **Base URL:** `AI_SERVICE_URL` env var (default `http://127.0.0.1:8000`)  
> **Status of this repo's knowledge:** Backend client code only — actual FastAPI implementation is separate

### POST `/ai/evaluate-response`
| Field | Value |
|-------|-------|
| **Called from** | `src/modules/evaluation/ai-client.ts:evaluateResponse()` |
| **Status** | `IMPLEMENTED_AND_USED` (client) / unknown (server) |
| **Request** | `{ transcript, question_text, duration_sec, difficulty, student_name }` |
| **Response** | `{ technical_score, fluency_score, clarity_score, pace_wpm, filler_count, is_pace_optimal, feedback, strengths, weaknesses, model_used, latency_ms }` |
| **Scores** | Raw; Node.js normalises all scores to 0–100 and computes composites |
| **Unreachable** | ai-client catches error; route writes `ai_runs` with `status=PENDING`; returns 503 |

### POST `/ai/evaluate-turn`
| Field | Value |
|-------|-------|
| **Called from** | `src/routes/interview.routes.ts` (audio turns endpoint) |
| **Status** | `IMPLEMENTED_AND_USED` (client call) |
| **Request** | `multipart/form-data` — forwarded audio file from `/api/sessions/:id/turns` |
| **Purpose** | Transcribes and evaluates audio turn for the mock interview flow |

### POST `/ai/generate-question`
| Field | Value |
|-------|-------|
| **Called from** | `src/modules/evaluation/ai-client.ts:generateQuestion()` |
| **Status** | `IMPLEMENTED_AND_USED` (client) |
| **Request** | `{ student_name, difficulty, previous_turns }` |
| **Response** | `{ question_text, skill_tags?, expected_topics? }` |
| **Fallback** | If FastAPI unreachable, `sessions.routes.ts` falls back to question bank |

### POST `/ai/evaluate-listening`
| Field | Value |
|-------|-------|
| **Status** | `DOCUMENTED_BUT_NOT_IMPLEMENTED` |
| **Note** | Listed in M2 checklist as `[NEEDS CONFIRMATION]`. No client call exists in current backend. |

### GET/POST `/ai/config`
| Field | Value |
|-------|-------|
| **Status** | `DOCUMENTED_BUT_NOT_IMPLEMENTED` in this repo |
| **Note** | Mentioned in architecture docs for switching LLM providers. No client call from backend. |

---

## 6. Event Bus Contracts

> **File:** `backend/src/shared/events/events.ts`  
> **Transport:** In-process Node.js `EventEmitter` — not durable (lost on crash)

### `USER_REGISTERED`
```typescript
payload: { userId: string, studentId: string, email: string, name: string }
```
| | |
|---|---|
| **Emitter** | `POST /api/auth/register` |
| **Listeners** | 1. `src/index.ts` — writes `system.audit_logs` (M1 handler) |
| | 2. `src/modules/credits/event-handlers.ts` — calls `CreditService.createAccount(studentId)` |
| **Status** | `IMPLEMENTED_AND_USED` end-to-end |
| **Idempotency** | `CreditService.createAccount()` has ON CONFLICT DO NOTHING guard |

### `ATTEMPT_COMPLETED`
```typescript
payload: {
  attemptId: string, assessmentId: string, studentId: string,
  assessmentType: string, technicalScore: number,
  communicationScore: number, overallScore: number, reportId: string | null
}
```
| | |
|---|---|
| **Emitter** | `POST /api/sessions/:id/complete` |
| **Listeners** | `src/modules/credits/event-handlers.ts` — earns credits + recalculates eligibility |
| **Status** | `IMPLEMENTED_AND_USED` end-to-end |
| **Design note** | Earn amount read from `credit_policies.consume_amount` (same field as assessment cost). Both default to 10 in seed. The policy does not have a separate earn_amount column. |
| **Idempotency** | `CreditService.earn()` idempotency key = `earn:studentId:ATTEMPT_COMPLETED:attemptId` |
| **M3 listener** | `DOCUMENTED_BUT_NOT_IMPLEMENTED` — M3 should listen to update performance profile |

### `CHECKLIST_ITEM_TOGGLED`
```typescript
payload: { studentId: string, itemId: string, isCompleted: boolean, toggledBy: string }
```
| | |
|---|---|
| **Emitter** | `POST /api/checklist/:itemId/toggle` |
| **Listeners** | None currently registered |
| **Status** | `IMPLEMENTED_BUT_NOT_CURRENTLY_USED` (emitted but no consumer) |

### `MENTOR_VERIFIED`
```typescript
payload: {
  studentId: string,
  mentorId: string,
  verifiedAt: string,
  checklistItemId: string | null,
  outcome: 'VERIFIED' | 'REJECTED'
}
```
| | |
|---|---|
| **Emitter** | `POST /api/verifications/:progressId/verify` |
| **Listeners** | None registered via eventBus (eligibility recalculated inline in route instead) |
| **Status** | `IMPLEMENTED_BUT_NOT_CURRENTLY_USED` (emitted; eligibility handled synchronously in route) |
| **Note** | `checklistItemId` and `outcome` added 2026-09-27 — payload now carries full context for downstream consumers |

---

## 7. Cross-Module Dependency Map

Format: `CALLER → FUNCTION/API → OWNER → STATUS`

### M1 → Shared Infrastructure
```
M1 → authenticate middleware → M1 → IMPLEMENTED_AND_USED (all protected routes)
M1 → requireRole middleware  → M1 → IMPLEMENTED_AND_USED (all role-restricted routes)
M1 → AppError, sendSuccess   → M1 → IMPLEMENTED_AND_USED (all modules)
M1 → org.students table      → M1 → IMPLEMENTED (FK used by M2, M4)
```

### M2 → M4
```
M2 (attempts.routes.ts) → CreditService.consume()  → M4 → IMPLEMENTED_AND_USED
M2 (sessions complete)  → ATTEMPT_COMPLETED event  → M4 listens → IMPLEMENTED_AND_USED
```

### M4 → M2
```
M4 event-handler → CreditService.earn() (own) after ATTEMPT_COMPLETED → IMPLEMENTED
```

### M4 → M3
```
M4 EligibilityService.recalculate() → performance.performance_profiles.overall_score → M3 → BLOCKED
  ↳ M3 has NOT implemented performance_profiles. Query returns empty → perfScore = 0 → students fail 60.0 threshold
```

### M2 → M3
```
M2 session.complete → ATTEMPT_COMPLETED event → M3 PerformanceService listener → NOT_IMPLEMENTED
M2 → performance.assessment_reports (write) → M3 reads → AVAILABLE (M3 not reading yet)
M2 → session.question_bank_item_skills → performance.skills FK → M3 owns skills → SEEDED (080_seed_skills.sql)
```

### M1 → M4
```
M1 auth.register → USER_REGISTERED event → M4 creates credit_accounts → IMPLEMENTED_AND_USED
M1 org.student_mentor_assignments → M4 verification scope guard → IMPLEMENTED
```

### M3 → M2 (planned, not implemented)
```
M3 → performance.assessment_reports (read) → M2 writes → AVAILABLE_NOT_CONSUMED
M3 → evaluation.response_evaluations (read) → M2 writes → AVAILABLE_NOT_CONSUMED
```

---

## 8. Documented but Not Implemented

| Endpoint / Feature | Documented In | Reason / Notes |
|--------------------|---------------|----------------|
| `GET /api/reports/student/:studentId` | M2 checklist §2 | Deferred post-MVP — needs pagination + scope |
| `/api/suggestions/*` chatbot | M2 checklist §17 | Deferred — requires LangGraph agent infrastructure |
| `POST /ai/evaluate-listening` | M2 checklist §2 | `[NEEDS CONFIRMATION]` — no client call in backend |
| `POST /ai/config` | Architecture docs | No client call from backend |
| `GET /api/portals/student|mentor|trainer|coordinator|admin` | M4 checklist, portal.routes.ts | **File is an empty stub** — no handlers implemented |
| `POST /api/portals/mentor/verify-task` | Portal routes comment | Stub only |
| M3 performance analytics APIs | M3 checklist | M3 has no implementation in this repo |
| M3 listening story APIs | M3 checklist | M3 has no implementation |
| `/api/credits/refund` | M4 checklist §17 | Post-MVP — refund policy not defined |
| `/api/credits/admin-adjust` | M4 checklist §17 | Post-MVP |
| `/api/placement/export` (CSV) | M4 checklist §17 | Post-MVP |
| ATTEMPT_COMPLETED → M3 performance listener | Architecture docs | M3 not implemented |
| USER_REGISTERED role guard (non-STUDENT no account) | M4 checklist §9 | Handler checks `if (!payload.studentId) return` — roles without studentId are skipped correctly |

---

## 9. Implemented but Not Currently Used

| Endpoint / Feature | Status Detail |
|--------------------|---------------|
| `CHECKLIST_ITEM_TOGGLED` event | Emitted by toggle endpoint; no consumer registered |
| `MENTOR_VERIFIED` event | Emitted; eligibility recalculated inline instead of via listener |
| `session.interview_transcripts` table (migration 016) | Written by audio turns with `.catch()` guard — active but only if migration 016 is applied to live DB |
| `sessionContextService` Redis turn cache | Implemented; inactive unless `REDIS_URL` env var is set |
| Credit policies PROGRAM / SUBDIVISION / STUDENT scope types | Schema + routes support scopes; only GLOBAL_DEFAULT seeded; narrower scopes available but not actively assigned |
| `credit_policies.conducted_attempt_policy` JSONB | Column exists; not read by any current code |

---

## 10. Blocked / Waiting on Another Module

| Feature | Blocked By | Impact |
|---------|------------|--------|
| `EligibilityService` performance check | M3 not implemented → `performance.performance_profiles` empty → `perfScore = 0` → all students ineligible on performance criterion | MEDIUM — checklist progress and credit balance criteria still work |
| `GET /api/placement-eligibility/:studentId` meaningful result | Same M3 blocker | Returns `is_eligible = false` with performance reason for all students until M3 delivers |
| M3 question bank skill tagging in `session.question_bank_item_skills` | Skills are seeded (migration 080 — 21 rows in `performance.skills`) but M2 skill-tag endpoints only work if skills exist | LOW — skills are seeded; M2 can tag questions now |
| Audio interview transcripts | Migration 016 must be applied to live Supabase DB | LOW — scores still recorded; only transcript text missing |
| Listening session sub-flow | `performance.listening_stories` table exists (migration 065) but M3 hasn't populated it | HIGH — no stories to serve |

---

## Appendix: Known Issues / Design Decisions

| ID | Issue | Severity | Decision |
|----|-------|----------|----------|
| DESIGN-01 | `event-handlers.ts` ATTEMPT_COMPLETED reads `consume_amount` for earn amount. Both consume and earn default to 10 in the seed, so this works, but the field name is misleading. | LOW | Functional. Document as design decision. Add separate `earn_amount` column if policies diverge. |
| DESIGN-02 | `attempts.routes.ts` credit cost was hardcoded to 1 (fixed 2026-09-26). Now reads from global `credit.credit_policies.consume_amount`. | FIXED | Fixed in this session. |
| DESIGN-03 | `POST /api/checklist/import-csv` accepts JSON, not an actual CSV file. Endpoint name implies CSV. | LOW | Simpler for API clients. Rename endpoint or add CSV parsing if coordinator UX requires file upload. |
| DESIGN-04 | `placement.checklist_items` requires `program_id NOT NULL`. M4 docs described simpler schema. Actual schema is more flexible (per-program items). | INFO | Routes handle this correctly; coordinator must supply programId when creating items. |
| DESIGN-05 | `checklist_progress` has no `is_completed` boolean (per M4 docs). Instead uses `status VARCHAR` (PENDING/IN_PROGRESS/COMPLETED/FAILED). `EligibilityService` joins on `is_mentor_verified` not `is_completed`. | INFO | Richer status model. Eligibility check is correct against actual schema. |
| BUG-01 | `verified_by_mentor_id` in `checklist_progress` is not in the actual migration — the verification link goes through `mentor_verifications` table instead. | INFO | Schema diverged from M4 doc. Actual implementation (mentor_verifications join) is correct. |

---

*Last updated: 2026-09-26 — audited from source, not from documentation*
