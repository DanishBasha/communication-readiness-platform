# API Specification — Communication Readiness Platform

> **Source of truth:** Backend route files + frontend `api.ts` cross-reference (2026-09-28 audit)  
> **Branch:** `feature/new-ui-backend-integration`  
> **Supersedes:** `API_REFERENCE.md` (planning document; field names and paths differ from implementation)  
> **For implementation detail per endpoint:** see `API_FUNCTION_CATALOG.md`  
> **For data flows:** see `SYSTEM_ARCHITECTURE.md`  
> **Base URL:** `http://localhost:5000` (Express backend)

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Status Legend](#2-status-legend)
3. [Endpoint Registry](#3-endpoint-registry)
4. [Event Bus Contracts](#4-event-bus-contracts)
5. [Frontend API Usage Map](#5-frontend-api-usage-map)
6. [Known Bugs & Mismatches](#6-known-bugs--mismatches)
7. [Unimplemented / Stub Endpoints](#7-unimplemented--stub-endpoints)

---

## 1. API Conventions

### Response Envelope

```json
// Success — single resource or action
{ "data": { ...resource } }

// Success — list
{ "data": [...], "pagination": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "error": { "code": "SCREAMING_SNAKE_CASE", "message": "human-readable" } }
```

### Authentication

All protected routes require: `Authorization: Bearer <token>`

JWT payload: `{ id, email, role, name, tokenVersion }` — signed with `JWT_SECRET` (HS256)

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No content (DELETE) |
| 400 | Bad request |
| 401 | Unauthenticated (missing/invalid/revoked token) |
| 402 | Insufficient credits |
| 403 | Forbidden (wrong role or scope) |
| 404 | Not found |
| 409 | Conflict (duplicate email, attempt already in-progress) |
| 422 | Validation error (Zod) |
| 503 | AI service unavailable |

### Pagination

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `limit` | 20 | 100 |

### All IDs are UUIDs

Non-UUID IDs are rejected with 400 at route level.

---

## 2. Status Legend

| Status | Meaning |
|--------|---------|
| `IU` | IMPLEMENTED_AND_USED — route exists, frontend calls it |
| `IN` | IMPLEMENTED_BUT_NOT_CURRENTLY_USED — route exists, no frontend call |
| `STUB` | Handler exists as comments only — returns 404 |
| `DEAD` | Frontend calls a path that doesn't exist in the backend |
| `BUG` | Route exists but frontend call has a field mismatch causing failure |

---

## 3. Endpoint Registry

### Health

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/health` | No | — | `IN` |

---

### Auth (`/api/auth`)

| Method | Path | Auth | Roles | Request (key fields) | Response | Status |
|--------|------|------|-------|---------------------|----------|--------|
| POST | `/api/auth/register` | No | — | `name, email, password (min 8), rollNumber (req), batchId (UUID req), subdivisionId (opt)` | `{ token, user, studentId }` | `IU` |
| POST | `/api/auth/login` | No | — | `email, password` | `{ token, user, studentId? }` | `IU` |
| POST | `/api/auth/logout` | Yes | Any | — | `{ message }` | `IU` |
| GET | `/api/auth/me` | Yes | Any | — | `{ user, studentId? }` | `IU` |

> **Note:** `rollNumber` is required by the server Zod schema. `API_REFERENCE.md` incorrectly omitted it.

---

### Org (`/api/org`) — Public, No Auth

| Method | Path | Query | Response | Status |
|--------|------|-------|----------|--------|
| GET | `/api/org/institutions` | — | `{ items: [{id, name, code, type}] }` | `IU` |
| GET | `/api/org/programs` | `institution_id?` | `{ items: [{id, institution_id, name, code}] }` | `IU` |
| GET | `/api/org/batches` | `program_id?` | `{ items: [{id, program_id, name, year, track}] }` | `IU` |
| GET | `/api/org/subdivisions` | `batch_id?` | `{ items: [{id, batch_id, name, type}] }` | `IU` |

---

### Programs (`/api/programs`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/programs` | No | — | `IN` |
| GET | `/api/programs/:programId/sub-programs` | No | — | `IN` |
| GET | `/api/programs/:programId/students` | Yes | FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR, TRAINER | `IN` |
| GET | `/api/programs/:programId/sub-programs/:subId/students` | Yes | FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR, TRAINER | `IN` |
| POST | `/api/programs` | Yes | PROGRAM_ADMIN | `IN` |
| PUT | `/api/programs/:id` | Yes | PROGRAM_ADMIN | `IN` |
| DELETE | `/api/programs/:id` | Yes | PROGRAM_ADMIN | `IN` |
| POST | `/api/programs/:programId/sub-programs` | Yes | PROGRAM_ADMIN | `IN` |
| PUT | `/api/programs/:programId/sub-programs/:subId` | Yes | PROGRAM_ADMIN | `IN` |
| DELETE | `/api/programs/:programId/sub-programs/:subId` | Yes | PROGRAM_ADMIN | `IN` |

> Frontend `college.getPrograms()` and `admin.getCollegePrograms()` are mock-only and do NOT call these endpoints. Could be wired to `GET /api/programs`.

---

### Students (`/api/students`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/students/:studentId` | Yes | STUDENT (own), FACULTY_MENTOR, PROGRAM_ADMIN, TRAINER | `IU` |
| PATCH | `/api/students/:studentId` | Yes | STUDENT (own), FACULTY_MENTOR, PROGRAM_ADMIN, TRAINER | `IU` |
| PATCH | `/api/students/:studentId/resume` | Yes | STUDENT own only | `IN` (frontend mock-only) |
| PATCH | `/api/students/:studentId/verify-resume` | Yes | FACULTY_MENTOR | `IN` |

---

### Admin (`/api/admin`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/admin/users` | Yes | PROGRAM_ADMIN | `IU` |
| PATCH | `/api/admin/users/:userId/role` | Yes | PROGRAM_ADMIN | `IN` |
| PATCH | `/api/admin/users/:userId/status` | Yes | PROGRAM_ADMIN | `IU` |
| POST | `/api/admin/students/import` | Yes | PROGRAM_ADMIN | `IN` (frontend modal is mock-only) |

> `admin.deleteUser` on frontend maps to `PATCH /status` with `status: 'SUSPENDED'` — no true delete endpoint.

---

### Mentors (`/api/mentors`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/mentors/my-students` | Yes | FACULTY_MENTOR | `IU` |
| POST | `/api/mentors/assign` | Yes | PROGRAM_ADMIN | `IU` |

Response for `/my-students`: `{ students: [{ id, roll_number, name, email, batch_name, track, subdivision_name }] }` — does NOT include program_name.

---

### Trainers (`/api/trainers`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/trainers/my-subdivisions` | Yes | TRAINER | `IU` |
| POST | `/api/trainers/assign` | Yes | PROGRAM_ADMIN | `IU` |

---

### Portals (`/api/portals`) — **ALL STUBS**

All 6 endpoints are comments in `portal.routes.ts` with no handlers: `GET /student|mentor|trainer|coordinator|admin`, `POST /mentor/verify-task` → All return 404.

---

### Assessments (`/api/assessments`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/assessments` | Yes | Any | `IU` |
| GET | `/api/assessments/:id` | Yes | Any | `IN` |
| POST | `/api/assessments` | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | `IN` |
| PUT | `/api/assessments/:id` | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | `IN` |

Assessment targeting fields: `target_program_id` (nullable UUID), `target_sub_program_id` (nullable UUID). NULL = open to all students.

---

### Attempts (`/api/attempts`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| POST | `/api/attempts/start` | Yes | STUDENT | `IU` |
| GET | `/api/attempts/:id` | Yes | STUDENT (own), FACULTY_MENTOR, PROGRAM_ADMIN | `IN` |
| PUT | `/api/attempts/:id/abandon` | Yes | STUDENT own | `IN` |

`POST /attempts/start` requires credit. Deducts `consume_amount` from global credit policy (default 10). Idempotency key = `consume:studentId:ASSESSMENT_START:assessmentId` — second attempt on same assessment does NOT charge again.

Assessment targeting enforced here: checks `org.student_programs` for program/sub-program enrollment.

---

### Sessions (`/api/sessions`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| POST | `/api/sessions/start` | Yes | STUDENT | `IU` |
| GET | `/api/sessions/:id` | Yes | STUDENT own | `IN` |
| POST | `/api/sessions/:id/proctor-event` | Yes | STUDENT own | `IU` |
| POST | `/api/sessions/:id/complete` | Yes | STUDENT own | `IU` |
| GET | `/api/sessions/bank-fallback` | Yes | STUDENT | `IU` |
| POST | `/api/sessions/:id/turns` | Yes | STUDENT own | `IU` |

**`GET /api/sessions/bank-fallback`** — query params: `difficulty?`, `domain?`. Note: `sessionId` is silently ignored. Returns one question from `session.question_bank_items`.

**`POST /api/sessions/:id/turns`** — multipart/form-data: `audio` file (WAV, max 10MB) + `metadata` JSON string. Returns `{ transcript, technicalScore, communicationScore, overallScore, feedback, strengths, weaknesses, nextDifficulty, audioMetrics: { paceWpm, fillerCount, fluencyScore, clarityScore } }`.

> ⚠️ Audio turns (POST /turns) do NOT write `evaluation.response_evaluations`. A session using only audio turns cannot call `POST /sessions/:id/complete` — it returns 422 `NO_RESPONSES`.

---

### Responses (`/api/responses`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| POST | `/api/responses/submit` | Yes | STUDENT | `IU` |
| GET | `/api/responses/:id` | Yes | STUDENT (own), FACULTY_MENTOR | `IN` |

`POST /responses/submit` request: `{ attemptId, questionId, transcript, inputType?, durationSec?, idempotencyKey? }`

Score formula for text path: `technical_score * 10`, `communication_score * 10` (straight multiply from FastAPI 0–10 → 0–100). Different from audio path composite formula.

---

### Reports (`/api/reports`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/reports/:attemptId` | Yes | STUDENT (own), FACULTY_MENTOR (assigned), PROGRAM_ADMIN | `IU` |

---

### Question Bank (`/api/question-bank`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/question-bank` | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN, PLACEMENT_COORDINATOR | `IN` |
| POST | `/api/question-bank` | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN | `IN` |
| PUT | `/api/question-bank/:id` | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN | `IN` |
| DELETE | `/api/question-bank/:id` | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | `IN` |

---

### Credits (`/api/credits`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/credits/balance/:studentId` | Yes | STUDENT (own), any staff | `IN` (frontend uses mock) |
| GET | `/api/credits/transactions/:studentId` | Yes | STUDENT (own), PROGRAM_ADMIN | `IN` |
| POST | `/api/credits/adjust` | Yes | PLACEMENT_COORDINATOR | `IN` |

### Credit Policies (`/api/credit-policies`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/credit-policies` | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | `IN` |
| POST | `/api/credit-policies` | Yes | PLACEMENT_COORDINATOR | `IN` |
| PUT | `/api/credit-policies/:id` | Yes | PLACEMENT_COORDINATOR | `IN` |

---

### Checklist (`/api/checklist`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/checklist` | Yes | Any | `IN` |
| GET | `/api/checklist/my-progress` | Yes | STUDENT | `IU` |
| GET | `/api/checklist/mentee/:studentId` | Yes | FACULTY_MENTOR | `IU` |
| POST | `/api/checklist` | Yes | PLACEMENT_COORDINATOR | `IN` |
| POST | `/api/checklist/import-csv` | Yes | PLACEMENT_COORDINATOR | `IN` |
| PUT | `/api/checklist/:id` | Yes | PLACEMENT_COORDINATOR | `IN` |
| DELETE | `/api/checklist/:id` | Yes | PLACEMENT_COORDINATOR | `IN` |
| POST | `/api/checklist/:itemId/toggle` | Yes | STUDENT | `IU` |

> `POST /checklist/import-csv` accepts JSON body `{ programId, subdivisionId?, rows: [...] }` — not a CSV file upload despite the endpoint name.

---

### Verifications (`/api/verifications`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/verifications/pending` | Yes | FACULTY_MENTOR | `IU` |
| POST | `/api/verifications/request` | Yes | STUDENT | `IN` |
| POST | `/api/verifications/:progressId/verify` | Yes | FACULTY_MENTOR | `IU` (**BUG — see §6**) |

`POST /verifications/:progressId/verify` request: `{ status: "VERIFIED" | "REJECTED", notes? }`

---

### Placement Eligibility (`/api/placement-eligibility`)

| Method | Path | Auth | Roles | Status |
|--------|------|------|-------|--------|
| GET | `/api/placement-eligibility/report` | Yes | PLACEMENT_COORDINATOR, PROGRAM_ADMIN | `IN` |
| GET | `/api/placement-eligibility/:studentId` | Yes | STUDENT (own), any staff | `IN` |
| POST | `/api/placement-eligibility/:studentId/recalculate` | Yes | PLACEMENT_COORDINATOR, PROGRAM_ADMIN, FACULTY_MENTOR | `IN` |

> All eligibility checks fail the performance criterion until M3 is implemented (`performance.performance_profiles` is never written → perfScore = 0 < threshold 60.0).

---

## 4. Event Bus Contracts

In-process `EventEmitter` — not durable. See `SYSTEM_ARCHITECTURE.md §7` for the full event flow diagram.

### `USER_REGISTERED`
```typescript
{ userId: string, studentId: string, email: string, name: string }
```
Emitted by: `POST /api/auth/register`, admin CSV import (new students only)  
Handled by: M4 `CreditService.createAccount()`, M1 audit log write

### `ATTEMPT_COMPLETED`
```typescript
{ attemptId, assessmentId, studentId, assessmentType, technicalScore, communicationScore, overallScore, reportId }
```
Emitted by: `POST /api/sessions/:id/complete` (via `setImmediate`)  
Handled by: M4 earn credits + recalculate eligibility

### `CHECKLIST_ITEM_TOGGLED`
Emitted by: `POST /api/checklist/:itemId/toggle` — **no consumer registered**

### `MENTOR_VERIFIED`
Emitted by: `POST /api/verifications/:progressId/verify` — **no consumer registered** (eligibility recalculated inline)

---

## 5. Frontend API Usage Map

Which `api.ts` methods call which backend endpoints:

| Frontend method | Backend endpoint | Notes |
|----------------|-----------------|-------|
| `api.auth.login()` | `POST /api/auth/login` | Falls to mock for DEMO_EMAILS on 401 |
| `api.auth.logout()` | `POST /api/auth/logout` | |
| `api.auth.me()` | `GET /api/auth/me` | Called on page load for auth hydration |
| `api.auth.registerCandidate()` | `POST /api/auth/register` | Re-throws 409/422 |
| `api.org.getInstitutions()` | `GET /api/org/institutions` | |
| `api.org.getPrograms()` | `GET /api/org/programs` | |
| `api.org.getBatches()` | `GET /api/org/batches` | |
| `api.org.getSubdivisions()` | `GET /api/org/subdivisions` | |
| `api.student.getProfile()` | `GET /api/students/:id` + `/checklist/my-progress` | |
| `api.student.updateProfile()` | `PATCH /api/students/:id` | |
| `api.mentors.getMyStudents()` | `GET /api/mentors/my-students` | Mock fallback on error |
| `api.mentors.assignMentor()` | `POST /api/mentors/assign` | |
| `api.admin.getFacultyMentors()` | `GET /api/admin/users?role=FACULTY_MENTOR` | |
| `api.admin.getStudents()` | `GET /api/admin/users?role=STUDENT` | |
| `api.admin.deleteUser()` | `PATCH /api/admin/users/:id/status` | Suspends, not deletes |
| `api.admin.getTrainerTenures()` | `GET /api/trainers/my-subdivisions` | |
| `api.admin.onboardTrainer()` | `POST /api/trainers/assign` | |
| `api.admin.getMentorMentees()` | `GET /api/mentors/my-students` | |
| `api.interview.start()` | `GET /api/assessments` + `POST /api/attempts/start` + `POST /api/sessions/start` | |
| `api.interview.submitAnswer()` | `POST /api/responses/submit` (text) or `GET /sessions/bank-fallback` + `POST /sessions/:id/turns` (audio) | |
| `api.interview.recordProctorEvent()` | `POST /api/sessions/:id/proctor-event` | |
| `api.interview.finalize()` | `POST /api/sessions/:id/complete` + `GET /api/reports/:id` | |
| `api.sessions.bankFallback()` | `GET /api/sessions/bank-fallback` | |
| `api.sessions.submitTurn()` | `POST /api/sessions/:id/turns` | Audio FormData |
| `api.tasks.toggleTask()` | `POST /api/checklist/:itemId/toggle` | |
| `api.tasks.verifyTask()` | `GET /api/verifications/pending` + `POST /api/verifications/:id/verify` | **BUG — see §6** |
| `api.admin.assignMentor()` | `POST /api/mentors/assign` | |

**Mock-only (no real backend call):**
- `api.college.getPrograms()` / `api.admin.getCollegePrograms()` — could be wired to `GET /api/programs`
- `api.admin.createFacultyMentor()` / `createProgramAdmin()` / `revokeTrainer()` — no backend routes
- `api.student.uploadResume()` — mock-only despite real `PATCH /students/:id/resume` existing
- `api.admin.students.import()` from the import modal

---

## 6. Known Bugs & Mismatches

| ID | File | Bug | Fix |
|----|------|-----|-----|
| BUG-API-01 | `frontend/src/services/api.ts` line ~835 | `tasks.verifyTask` sends `{ outcome: 'VERIFIED' }` to `POST /verifications/:id/verify` but backend Zod schema expects `{ status: 'VERIFIED' \| 'REJECTED' }` → always returns 422 | Change `outcome` to `status` in the api.ts verifyTask call |
| BUG-API-02 | `frontend/src/services/api.ts` | `admin.createStudent` calls `POST /api/auth/register` with a mock `batchId` from `fetchFirstBatchId()` — no real API call to fetch a valid batch UUID | Wire `fetchFirstBatchId()` to `GET /api/org/batches?program_id=...` |
| BUG-API-03 | `frontend/src/services/api.ts` | `interview.submitAnswer` sends `sessionId` as query param to `GET /sessions/bank-fallback` but backend ignores it | Harmless (no error) but semantically misleading |

---

## 7. Unimplemented / Stub Endpoints

| Endpoint | Notes |
|----------|-------|
| `GET/POST /api/portals/*` | All 6 portal endpoints are stubs — no handlers |
| `GET /api/reports/student/:studentId` | Not implemented — only `GET /api/reports/:attemptId` exists |
| `POST /ai/evaluate-listening` | No client call in backend; not implemented |
| M3 endpoints (skills, performance, listening stories) | M3 module not built; no routes |
| `/api/suggestions/*` | Post-MVP chatbot — not built |
| `POST /api/credits/adjust` | Implemented but no frontend call |
| `GET /api/credits/balance/:studentId` | Implemented but frontend uses mock credit display |
