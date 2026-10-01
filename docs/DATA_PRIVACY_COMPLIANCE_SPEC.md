# Data Privacy & Compliance Specification

> **Source of truth:** Backend source code audit (2026-09-28)  
> **Branch:** `feature/new-ui-backend-integration`  
> **Scope:** Single-college deployment (~2,000–3,000 students)

---

## Table of Contents

1. [Personal Data Inventory](#1-personal-data-inventory)
2. [Credential Handling](#2-credential-handling)
3. [Student Data Access Control](#3-student-data-access-control)
4. [AI Processing of Student Data](#4-ai-processing-of-student-data)
5. [File Upload Handling](#5-file-upload-handling)
6. [Audio Data Handling](#6-audio-data-handling)
7. [JWT & Token Security](#7-jwt--token-security)
8. [Data Retention](#8-data-retention)
9. [Data Deletion](#9-data-deletion)
10. [Compliance Gaps](#10-compliance-gaps)

---

## 1. Personal Data Inventory

| Data | Table | Fields | Classification |
|------|-------|--------|----------------|
| User identity | `identity.users` | name, email, password_hash, role | PII — Sensitive |
| Student enrollment | `org.students` | roll_number, batch_id, coding_handles, resume_url | PII — Educational |
| Audio responses | `session.interview_transcripts` | question, answer (transcript), stt_raw | PII — Educational |
| Assessment attempts | `assessment.assessment_attempts` | student_id, assessment_id, status, scores | Educational record |
| Performance scores | `performance.assessment_reports` | student_id, technical_score, communication_score, overall_score | Educational record |
| Placement eligibility | `placement.placement_eligibility` | student_id, is_eligible, blocking_reasons | Educational record |
| Audit log | `system.audit_logs` | user_id, action | PII — Audit |
| Credit transactions | `credit.credit_transactions` | student_id, amount, reason | Financial record |
| Mentor assignments | `org.student_mentor_assignments` | student_id, mentor_id | Relationship data |
| Resume files | Local `uploads/` dir | PDF files | PII — Document |

---

## 2. Credential Handling

Passwords are handled with the following security controls (confirmed by code audit):

- **Hashing:** bcrypt with cost factor 10 (`bcrypt.hash(password, 10)`)
- **Never stored in plaintext** — only the `password_hash` column is persisted
- **Never returned in API responses** — `password_hash` is never selected in any query that builds API responses
- **Never logged** — no `console.log`, `morgan`, or audit log writes include any password variable
- **CSV import security:** In bulk student import, the raw password string (`passwordRaw`) is extracted from the CSV row and immediately passed to `bcrypt.hash()`. It is never stored in an intermediate object, never re-assigned, and never logged.
- **Timing attack mitigation:** Login endpoint always runs `bcrypt.compare` (against a DUMMY_HASH if email not found) to prevent user enumeration via response timing

**What to verify before production:**
- Confirm `bcrypt` cost factor is adequate for your server hardware (cost 10 = ~100ms on modern hardware)
- Confirm `password_hash` is never included in any JOIN query that returns to the client
- Audit CSV import logs to confirm no password values appear

---

## 3. Student Data Access Control

Access to student records is enforced at the route level:

| Operation | Who can access | Enforcement |
|-----------|---------------|-------------|
| View own profile | STUDENT | `requireStudentSelfOrStaff` — compares `org.students.user_id === req.user.id` |
| View any student profile | FACULTY_MENTOR, PROGRAM_ADMIN, TRAINER | `requireStudentSelfOrStaff` passes staff roles |
| View assigned mentee checklist | FACULTY_MENTOR | Scope guard: `org.student_mentor_assignments` query verifies assignment |
| View assigned mentee report | FACULTY_MENTOR | Report route checks mentor→student assignment |
| View verification details | FACULTY_MENTOR | Scope guard: checks assignment before returning |
| Admin bulk view | PROGRAM_ADMIN | `requireRole('PROGRAM_ADMIN')` |
| Placement eligibility | PLACEMENT_COORDINATOR, PROGRAM_ADMIN | Role guard |
| Own placement eligibility | STUDENT | Route explicitly checks `student.user_id === req.user.id` |

**What is NOT enforced:**
- TRAINER can read any student profile (via `requireStudentSelfOrStaff`) even without an assignment to that student — this may be overly permissive
- `GET /api/credits/balance/:studentId` and `GET /api/credits/transactions/:studentId` have no student-to-role scope guard beyond role check — any FACULTY_MENTOR can view any student's credit balance

---

## 4. AI Processing of Student Data

Student data sent to the FastAPI AI service:

| Data | Sent to AI | Purpose |
|------|-----------|---------|
| Audio recording (WAV) | ✅ Yes | STT transcription via Groq Whisper |
| Question text | ✅ Yes | Evaluation context for LLM |
| Answer transcript | ✅ Yes | Evaluation by LLM |
| Previous 10 turns | ✅ Yes | Conversation context for LLM |
| Student name | ✅ Yes (in question generation) | Personalised question generation |
| Student ID / email | ❌ No | Not sent to AI service |
| Roll number | ❌ No | Not sent to AI service |
| Resume content | ❌ No (in current implementation) | Planned but not sent |

**Data flow:** Backend → FastAPI → Groq API (external). Audio and transcripts leave the platform boundary when the AI service is configured with an external LLM provider (Groq, OpenAI, etc.).

**Privacy considerations:**
- Student audio and transcript data is sent to external LLM APIs when using Groq/OpenAI
- No data anonymisation occurs before sending to external LLM
- AI service response data (transcript, scores, feedback) is stored in `session.interview_transcripts` and `evaluation.*` tables
- Using `mock` provider in ai-service keeps all data on-premises

---

## 5. File Upload Handling

**Resume uploads** (`PATCH /api/students/:id/resume`):
- Stored by `LocalStorageClient` in the `UPLOAD_DIR` directory (default `uploads/`)
- File type restricted to PDF only (multer filter)
- Max size: `UPLOAD_MAX_FILE_SIZE_MB` (default 5 MB)
- File path stored in `org.students.resume_url`
- Accessible only to: owner STUDENT, FACULTY_MENTOR, PROGRAM_ADMIN

**CSV imports** (`POST /api/admin/students/import`):
- File held in memory only (multer `memoryStorage`)
- Parsed row-by-row; not persisted as a file
- Contains student PII (name, email, roll number, password)
- Never written to disk or logged

**Audio recordings** (`POST /api/sessions/:id/turns`):
- Held in memory (multer `memoryStorage`, max 10 MB)
- Forwarded to FastAPI via FormData
- Not persisted locally
- Transcript stored in `session.interview_transcripts.stt_raw` and `.answer`

---

## 6. Audio Data Handling

Audio recordings are processed in-memory only and not persisted as files:

1. Student records audio in browser via WebRTC/MediaRecorder + VAD (`useVoiceCapture.ts`)
2. WAV blob sent to `POST /api/sessions/:id/turns` as multipart
3. Backend holds in memory → forwards to FastAPI `/ai/evaluate-response`
4. FastAPI runs STT + LLM evaluation → returns transcript + scores
5. Backend stores transcript in `session.interview_transcripts` (text only)
6. Original audio blob is discarded — not stored anywhere

**No audio files are permanently stored on the server.**  
The only audio-derived data retained is the text transcript and evaluation scores.

---

## 7. JWT & Token Security

- **Algorithm:** HS256 with `JWT_SECRET`
- **Payload:** `{ id, email, role, name, tokenVersion }` — contains name and email (PII in token)
- **Token revocation:** `token_version` DB check on every request — tokens invalidated on logout
- **Storage:** Frontend stores JWT in `localStorage` — vulnerable to XSS; `httpOnly` cookie would be safer
- **Expiry:** 7 days default (configurable via `JWT_EXPIRES_IN`)
- **No refresh tokens:** Single-use long-lived token; re-login required after expiry

---

## 8. Data Retention

No automated data retention policies are implemented. Data persists until explicitly deleted.

| Data | Retention | Notes |
|------|-----------|-------|
| User accounts | Indefinite | Can be SUSPENDED but not deleted via API |
| Assessment attempts | Indefinite | Append-only; no deletion endpoint |
| Session transcripts | Indefinite (DB) + 2 hours (Redis TTL) | Redis flushed to DB; DB retained |
| Credit transactions | Indefinite | Append-only ledger |
| Audit logs | Indefinite | Append-only |
| Resume files | Indefinite (until UPLOAD_DIR cleaned) | No file deletion endpoint |
| Audio recordings | Not retained (held in memory only) | |

---

## 9. Data Deletion

**No bulk data deletion is currently implemented.**

Available mechanisms:
- `PATCH /api/admin/users/:id/status` with `status: 'SUSPENDED'` — suspends account (cannot log in) but does not delete data
- `PATCH /api/admin/users/:id/role` — changes role but does not delete data
- No endpoint to delete a user, student record, attempt, report, or transcript

For GDPR right-to-erasure or institution policy compliance, manual database operations would currently be required.

---

## 10. Compliance Gaps

| Gap | Description | Risk |
|----|------------|------|
| No data deletion API | No GDPR right-to-erasure implementation | Compliance risk if serving EU students |
| JWT in localStorage | Tokens stored in localStorage are XSS-accessible | Security gap; prefer httpOnly cookies |
| No email verification | Registration accepts any email string | Could be used to register fake accounts |
| External AI API | Audio/transcripts sent to Groq/OpenAI without anonymisation | Data privacy risk for student recordings |
| No consent mechanism | No recording of student consent for AI processing of audio | Compliance risk depending on jurisdiction |
| Broad trainer access | TRAINER can read any student profile without assignment check | Data minimisation concern |
| Credit balance visibility | FACULTY_MENTOR can view any student's credit balance | Minor data minimisation concern |
| No audit log on login/logout | Login events not recorded in audit_logs | Forensic gap |
| Resume files unencrypted | Resume PDFs stored in plain filesystem | At-rest encryption not implemented |
| No data at rest encryption | PostgreSQL not configured with column-level encryption | Sensitive fields (password_hash aside) stored as plaintext |
