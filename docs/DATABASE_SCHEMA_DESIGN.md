# Database Schema Design — Communication Readiness Platform

> **Source of truth:** Migration files in `backend/src/database/migrations/`  
> **Audited:** 2026-09-28 (database/migration audit agent)  
> **Branch:** `feature/new-ui-backend-integration`  
> **PostgreSQL:** Supabase (PostgreSQL 15 + pgvector extension)

---

## Table of Contents

1. [Database Schemas](#1-database-schemas)
2. [Migration Inventory](#2-migration-inventory)
3. [Table Catalog](#3-table-catalog)
4. [Foreign Key Relationships](#4-foreign-key-relationships)
5. [Enum Types](#5-enum-types)
6. [DB Functions & Triggers](#6-db-functions--triggers)
7. [pgvector Tables](#7-pgvector-tables)
8. [Seed Data](#8-seed-data)
9. [Known Issues](#9-known-issues)

---

## 1. Database Schemas

Created in migration `002_schemas.sql`:

| Schema | Owner Module | Purpose |
|--------|-------------|---------|
| `identity` | M1 | Users and authentication |
| `org` | M1 | Institutions, programs, batches, subdivisions, students, assignments |
| `system` | M1/infra | Migration tracking, audit logs |
| `assessment` | M2 | Assessment definitions, components, attempts |
| `session` | M2 | Sessions, questions, question bank, interview transcripts |
| `evaluation` | M2 | Responses, AI runs, evaluations |
| `performance` | M2/M3 | Assessment reports (M2), skill profiles/snapshots (M3) |
| `knowledge` | M3 | RAG documents and chunks (not yet populated) |
| `agent` | reserved | Created in 002; no tables defined in any migration |
| `credit` | M4 | Credit accounts, transactions, policies |
| `placement` | M4 | Checklist items, progress, verifications, eligibility |

---

## 2. Migration Inventory

Migration runner: `backend/src/database/migrate.ts` — applies files **alphabetically by filename** in a `BEGIN/COMMIT` per file. Tracks applied files in `system.migrations`.

### M1 — Identity & Org Foundation

| Migration | Description | Notes |
|-----------|-------------|-------|
| `001_extensions.sql` | Enable `uuid-ossp`, `pgcrypto`, `pg_trgm` | infra |
| `002_schemas.sql` | Create all 11 DB schemas | infra |
| `003_identity_users.sql` | `identity.users` table | Defines `user_role`, `user_status` enums |
| `004_system_audit_logs.sql` | `system.audit_logs` | No FK to users (intentional) |
| `005_org_institutions.sql` | `org.institutions` | |
| `006_org_programs.sql` | `org.programs` | FK → institutions |
| `007_org_batches.sql` | `org.batches` | Defines `student_track` enum; FK → programs |
| `008_org_subdivisions.sql` | `org.subdivisions` | FK → batches |
| `009_org_students.sql` | `org.students` | FK → users (CASCADE), batches, subdivisions |
| `010_org_faculty_profiles.sql` | `org.faculty_profiles` | FK → users (CASCADE) |
| `011_org_trainer_subdivision_assignments.sql` | `org.trainer_subdivision_assignments` | FK → users×2, subdivisions |
| `012_org_student_mentor_assignments.sql` | `org.student_mentor_assignments` | Partial UNIQUE: one active mentor per student |
| `013_identity_indexes.sql` | Indexes on `identity.users`, `system.audit_logs` | |
| `014_org_indexes.sql` | Indexes on all org tables | |
| `015_updated_at_triggers.sql` | `system.set_updated_at()` function; triggers on users, students | |
| `016_session_transcripts.sql` | `session.interview_transcripts` | FK on `student_id` only (session FK deferred to 116) |

### M2 — Assessment Engine

| Migration | Description |
|-----------|-------------|
| `031_assessment_assessments.sql` | `assessment.assessments`; creates `vector` extension |
| `032_assessment_components.sql` | `assessment.assessment_components` (FK → assessments CASCADE) |
| `033_assessment_attempts.sql` | `assessment.assessment_attempts` |
| `034_session_assessment_sessions.sql` | `session.assessment_sessions` (UNIQUE FK → attempts) |
| `035_session_question_bank_items.sql` | `session.question_bank_items` (pgvector embedding 1536d) |
| `036_session_question_bank_item_skills.sql` | `session.question_bank_item_skills` |
| `037_session_questions.sql` | `session.questions` |
| `038_evaluation_responses.sql` | `evaluation.responses` (idempotency_key UNIQUE) |
| `039_evaluation_ai_runs.sql` | `evaluation.ai_runs` |
| `040_evaluation_response_evaluations.sql` | `evaluation.response_evaluations` (UNIQUE → responses) |
| `041_performance_assessment_reports.sql` | `performance.assessment_reports` (UNIQUE → attempts) |
| `042_m2_indexes.sql` | Indexes for all M2 tables |
| `043_m2_updated_at_triggers.sql` | Triggers on assessments, sessions, question_bank_items |

### M3 — Performance & Knowledge

| Migration | Description |
|-----------|-------------|
| `061_performance_skills.sql` | `performance.skills` (UNIQUE on category+name) |
| `062_performance_profiles.sql` | `performance.performance_profiles` (student_id UNIQUE) |
| `063_performance_snapshots.sql` | `performance.performance_snapshots` (attempt_id UNIQUE, append-only) |
| `064_performance_skill_performances.sql` | `performance.skill_performances` (append-only) |
| `065_performance_listening_stories.sql` | `performance.listening_stories` |
| `066_knowledge_documents.sql` | `knowledge.knowledge_documents` (no FKs on scope columns) |
| `067_knowledge_chunks.sql` | `knowledge.knowledge_chunks` (pgvector 1536d; FK → documents CASCADE) |
| `068_m3_indexes.sql` | Indexes including IVFFlat for knowledge_chunks embeddings |
| `069_m3_updated_at_triggers.sql` | Triggers on skills, performance_profiles, listening_stories, knowledge_documents |
| `080_seed_skills.sql` | Inserts 21 skills (7 TECHNICAL, 6 COMMUNICATION, 5 BEHAVIORAL, 3 DOMAIN_SPECIFIC) |

### M4 — Credits & Placement

| Migration | Description |
|-----------|-------------|
| `091_credit_accounts.sql` | `credit.credit_accounts` (balance CHECK ≥ 0) |
| `092_credit_transactions.sql` | `credit.credit_transactions` (append-only ledger; idempotency UNIQUE) |
| `093_credit_policies.sql` | `credit.credit_policies` |
| `094_checklist_items.sql` | `placement.checklist_items` |
| `095_checklist_progress.sql` | `placement.checklist_progress` |
| `096_mentor_verifications.sql` | `placement.mentor_verifications` |
| `097_placement_eligibility.sql` | `placement.placement_eligibility` (student_id UNIQUE) |
| `098_m4_indexes.sql` | Indexes for all M4 tables |
| `099_m4_updated_at_triggers.sql` | Triggers on M4 tables |
| `105_seed_credit_policies.sql` | Inserts `GLOBAL_DEFAULT` policy (initial=50, consume=10, ceiling=200) |
| `106_seed_checklist_items.sql` | Placeholder — no rows inserted |

### Shared FKs & Late Additions

| Migration | Description |
|-----------|-------------|
| `115_shared_fks.sql` | All deferred cross-schema FKs (M3 → M1, M4 → M1, M2 → M3) |
| `116_interview_transcript_fk.sql` | FK `session_id → session.assessment_sessions` (CASCADE); FK `response_id → evaluation.responses` (SET NULL) — **⚠️ see Known Issues** |
| `120_org_sub_programs.sql` | `org.sub_programs` |
| `121_org_student_programs.sql` | `org.student_programs` |
| `122_assessment_targeting.sql` | ADD COLUMN `target_program_id`, `target_sub_program_id` to `assessment.assessments` |
| `123_student_track_import.sql` | ADD ENUM VALUE `'IMPORT'` to `org.student_track` |

---

## 3. Table Catalog

### Schema: `identity`

**`identity.users`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `name` | VARCHAR | NOT NULL |
| `email` | VARCHAR | NOT NULL, UNIQUE |
| `password_hash` | TEXT | NOT NULL |
| `role` | `user_role` enum | NOT NULL |
| `token_version` | INT | NOT NULL, DEFAULT 0 |
| `status` | `user_status` enum | NOT NULL, DEFAULT 'ACTIVE' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() (auto-trigger) |

### Schema: `org`

**`org.institutions`** — `id, name, code, type, created_at`

**`org.programs`** — `id, institution_id (FK→institutions), name, code, created_at`

**`org.batches`** — `id, program_id (FK→programs), name, year, track (student_track enum), created_at`

**`org.subdivisions`** — `id, batch_id (FK→batches), name, type, created_at`

**`org.students`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → identity.users (CASCADE) |
| `roll_number` | VARCHAR | NOT NULL |
| `batch_id` | UUID | FK → org.batches |
| `subdivision_id` | UUID | FK → org.subdivisions (nullable) |
| `coding_handles` | JSONB | DEFAULT `'{}'` |
| `resume_url` | TEXT | nullable |
| `resume_verified` | BOOLEAN | DEFAULT false |

**`org.faculty_profiles`** — `id, user_id (FK→users CASCADE), department, created_at`

**`org.trainer_subdivision_assignments`** — `id, trainer_id (FK→users), subdivision_id (FK→subdivisions), start_date, end_date (nullable), assigned_by (FK→users), created_at`

**`org.student_mentor_assignments`** — `id, student_id (FK→students), mentor_id (FK→users), assigned_by (FK→users), is_active, assigned_at`
- UNIQUE partial index: only one `is_active = true` row per student

**`org.sub_programs`** — `id, program_id (FK→programs), name, code, is_active, updated_at`
- UNIQUE (program_id, code)

**`org.student_programs`** — `student_id (FK→students), program_id (FK→programs), sub_program_id (FK→sub_programs, nullable), enrolled_at`
- UNIQUE (student_id, program_id)

### Schema: `assessment`

**`assessment.assessments`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `name` | VARCHAR | |
| `assessment_type` | VARCHAR | e.g. `MOCK_INTERVIEW`, `LISTENING_COMPREHENSION` |
| `interview_type` | VARCHAR | nullable |
| `version` | INT | |
| `description` | TEXT | nullable |
| `is_active` | BOOLEAN | DEFAULT true |
| `target_program_id` | UUID | FK → org.programs (nullable; NULL = open to all) |
| `target_sub_program_id` | UUID | FK → org.sub_programs (nullable) |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**`assessment.assessment_components`** — `id, assessment_id (FK→assessments CASCADE), component_type, weight, config JSONB`

**`assessment.assessment_attempts`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `assessment_id` | UUID | FK → assessments |
| `student_id` | UUID | FK → org.students |
| `status` | VARCHAR | `IN_PROGRESS`, `COMPLETED`, `ABANDONED` |
| `interview_type` | VARCHAR | |
| `program_id` | UUID | FK → org.programs (snapshot at attempt time) |
| `batch_id` | UUID | FK → org.batches |
| `subdivision_id` | UUID | FK → org.subdivisions |
| `credit_policy_snapshot` | JSONB | Policy config at time of consume |
| `started_at`, `completed_at` | TIMESTAMPTZ | |

### Schema: `session`

**`session.assessment_sessions`** — `id, attempt_id (UNIQUE FK→attempts), state (INITIALIZED/ACTIVE/PAUSED/COMPLETED/TERMINATED), current_sequence_no, state_data JSONB, expires_at`

**`session.question_bank_items`** — `id, question_text, difficulty, evaluation_criteria, metadata JSONB, embedding VECTOR(1536), is_active, created_at, updated_at`

**`session.question_bank_item_skills`** — `question_bank_item_id (FK→question_bank_items), skill_id (FK→performance.skills via 115)`

**`session.questions`** — `id, attempt_id (FK→attempts), question_bank_item_id (FK→question_bank_items, nullable), question_text, difficulty, sequence_no, is_generated, type, listening_story_id (FK via 115), primary_skill_id (FK via 115, SET NULL)`

**`session.interview_transcripts`** — `id, session_id (FK→assessment_sessions CASCADE via 116), student_id (FK→students), turn_number, question, answer, difficulty, stt_raw, created_at`
- UNIQUE (session_id, turn_number) — idempotent inserts

### Schema: `evaluation`

**`evaluation.responses`** — `id, attempt_id (FK→attempts), question_id (FK→questions), input_type (VOICE/TEXT/MIXED), transcript, duration_sec, idempotency_key (UNIQUE), created_at`

**`evaluation.ai_runs`** — `id, response_id (FK→responses, nullable), capability, status (PENDING/COMPLETED/FAILED), latency_ms, response_metadata JSONB, created_at`

**`evaluation.response_evaluations`** — `id, response_id (UNIQUE FK→responses), ai_run_id (FK→ai_runs), technical_score, communication_score, communication_metrics JSONB, feedback, strengths, weaknesses, created_at`

### Schema: `performance`

**`performance.assessment_reports`** — `id, attempt_id (UNIQUE FK→attempts), student_id (FK→students), technical_score, communication_score, overall_score, component_scores JSONB, strengths JSONB[], weaknesses JSONB[], feedback, is_proctor_flagged, tab_switch_count, generated_at`

**`performance.skills`** — `id, category, name, description, is_active`  (UNIQUE on category+name)

**`performance.performance_profiles`** — `id, student_id (UNIQUE FK via 115), overall_score, technical_score, communication_score, last_computed_at` ← **never written; M3 not implemented**

**`performance.performance_snapshots`** — `id, student_id (FK via 115), attempt_id (UNIQUE FK via 115), snapshot JSONB, created_at` ← append-only; never written

**`performance.skill_performances`** — `id, student_id, attempt_id, skill_id, score, created_at` ← append-only; never written

**`performance.listening_stories`** — `id, title, audio_url, transcript, questions JSONB, difficulty, updated_at`

### Schema: `knowledge`

**`knowledge.knowledge_documents`** — `id, title, content, scope columns (institution/program/subdivision UUIDs, no FKs), created_at, updated_at`

**`knowledge.knowledge_chunks`** — `id, document_id (FK→knowledge_documents CASCADE), chunk_text, embedding VECTOR(1536), chunk_index, created_at`

### Schema: `credit`

**`credit.credit_accounts`** — `id, student_id (UNIQUE FK via 115), balance (CHECK ≥ 0), created_at, updated_at`

**`credit.credit_transactions`** — `id, account_id (FK→credit_accounts), student_id (FK via 115), transaction_type (INITIAL/EARN/CONSUME), amount, balance_after, idempotency_key (UNIQUE), reference_id, reason, created_at`

**`credit.credit_policies`** — `id, scope_type (GLOBAL/PROGRAM/SUBDIVISION/STUDENT), is_active, initial_credit_amount, consume_amount, max_balance, program_id, subdivision_id, student_id, created_at, updated_at`

### Schema: `placement`

**`placement.checklist_items`** — `id, program_id (FK via 115), subdivision_id (FK via 115, nullable), name, description, category, max_score, weight, is_required, is_active, created_at, updated_at`

**`placement.checklist_progress`** — `id, student_id (FK via 115), checklist_item_id (FK→checklist_items), status (PENDING/IN_PROGRESS/COMPLETED/FAILED), score, completion_evidence, is_mentor_verified, completed_at`
- UNIQUE (student_id, checklist_item_id)

**`placement.mentor_verifications`** — `id, checklist_progress_id (FK→checklist_progress), student_id (FK via 115), mentor_user_id (FK via 115), status (PENDING/VERIFIED/REJECTED), notes, created_at, updated_at`

**`placement.placement_eligibility`** — `id, student_id (UNIQUE FK via 115), total_score, maximum_score, threshold_score, is_eligible, blocking_reasons JSONB, reason, evaluated_at`

---

## 4. Foreign Key Relationships

```
identity.users ←─(CASCADE)─ org.students
identity.users ←─(CASCADE)─ org.faculty_profiles
identity.users ←─────────── org.trainer_subdivision_assignments (trainer_id, assigned_by)
identity.users ←─────────── org.student_mentor_assignments (mentor_id, assigned_by)
identity.users ←─────────── placement.mentor_verifications.mentor_user_id  [via 115]

org.institutions ←── org.programs
org.programs ←── org.batches
org.programs ←── org.sub_programs                          [migration 120]
org.programs ←── org.student_programs                     [migration 121]
org.programs ←── assessment.assessments.target_program_id  [migration 122]
org.programs ←── placement.checklist_items                 [via 115]
org.batches ←── org.subdivisions
org.batches ←── org.students
org.batches ←── assessment.assessment_attempts.batch_id
org.subdivisions ←── org.students
org.subdivisions ←── org.trainer_subdivision_assignments
org.subdivisions ←── assessment.assessment_attempts.subdivision_id
org.subdivisions ←── placement.checklist_items              [via 115]
org.sub_programs ←── org.student_programs                  [migration 121]
org.sub_programs ←── assessment.assessments.target_sub_program_id  [migration 122]

org.students ←── assessment.assessment_attempts
org.students ←── performance.assessment_reports
org.students ←── session.interview_transcripts.student_id
org.students ←── performance.performance_profiles           [via 115]
org.students ←── performance.performance_snapshots          [via 115]
org.students ←── performance.skill_performances             [via 115]
org.students ←── credit.credit_accounts                     [via 115]
org.students ←── credit.credit_transactions                 [via 115]
org.students ←── placement.checklist_progress               [via 115]
org.students ←── placement.mentor_verifications             [via 115]
org.students ←── placement.placement_eligibility            [via 115]
org.students ←── org.student_programs

assessment.assessments ←─(CASCADE)─ assessment.assessment_components
assessment.assessments ←── assessment.assessment_attempts
assessment.assessment_attempts ←─(UNIQUE)─ session.assessment_sessions
assessment.assessment_attempts ←── session.questions
assessment.assessment_attempts ←── evaluation.responses
assessment.assessment_attempts ←─(UNIQUE)─ performance.assessment_reports
assessment.assessment_attempts ←── performance.performance_snapshots.attempt_id  [via 115]
assessment.assessment_attempts ←── performance.skill_performances.attempt_id    [via 115, SET NULL]

session.assessment_sessions ←─(CASCADE via 116)─ session.interview_transcripts.session_id
session.question_bank_items ←── session.question_bank_item_skills
session.questions ←── evaluation.responses
evaluation.responses ←─(UNIQUE)─ evaluation.response_evaluations
evaluation.responses ←── evaluation.ai_runs
evaluation.responses ←─(SET NULL via 116)─ session.interview_transcripts.response_id  ⚠️ column missing

performance.skills ←── performance.skill_performances
performance.skills ←── session.question_bank_item_skills   [via 115]
performance.skills ←── session.questions.primary_skill_id  [via 115, SET NULL]
performance.listening_stories ←── session.questions.listening_story_id  [via 115, SET NULL]

knowledge.knowledge_documents ←─(CASCADE)─ knowledge.knowledge_chunks
credit.credit_accounts ←── credit.credit_transactions
```

---

## 5. Enum Types

| Type | Schema | Values |
|------|--------|--------|
| `user_role` | `identity` | `STUDENT`, `FACULTY_MENTOR`, `PROGRAM_ADMIN`, `TRAINER`, `PLACEMENT_COORDINATOR` |
| `user_status` | `identity` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `student_track` | `org` | `HOPE_ELITE`, `HOPE_NON_ELITE`, `PEP`, `DEPARTMENT`, `IMPORT` |

> **Important:** Frontend roles `PLATFORM_OWNER` and `SUPER_ADMIN` are **not in the database enum** and cannot be stored in `identity.users.role`.

---

## 6. DB Functions & Triggers

All `updated_at` columns are managed automatically by:

**Function:** `system.set_updated_at()` — BEFORE UPDATE trigger that sets `updated_at = now()`

**Triggers defined on:**
`identity.users`, `org.students`, `assessment.assessments`, `session.assessment_sessions`, `session.question_bank_items`, `performance.skills`, `performance.performance_profiles`, `performance.listening_stories`, `knowledge.knowledge_documents`, `credit.credit_accounts`, `credit.credit_policies`, `placement.checklist_items`, `placement.checklist_progress`, `placement.mentor_verifications`, `placement.placement_eligibility`

No Row Level Security (RLS) policies are defined in any migration.

---

## 7. pgvector Tables

| Table | Column | Dimensions | Index |
|-------|--------|-----------|-------|
| `session.question_bank_items` | `embedding` | 1536 | None (cosine search without index) |
| `knowledge.knowledge_chunks` | `embedding` | 1536 | IVFFlat `vector_cosine_ops` lists=100 |

---

## 8. Seed Data

| Migration | Data |
|-----------|------|
| `080_seed_skills.sql` | 21 skills: 7 TECHNICAL, 6 COMMUNICATION, 5 BEHAVIORAL, 3 DOMAIN_SPECIFIC. `ON CONFLICT DO NOTHING`. |
| `105_seed_credit_policies.sql` | 1 policy: `GLOBAL_DEFAULT` (initial_credit_amount=50, consume_amount=10, max_balance=200). `ON CONFLICT DO NOTHING`. |
| `106_seed_checklist_items.sql` | Placeholder only — no rows. Items created via API or coordinator import. |

---

## 9. Known Issues

| ID | Issue | Migration | Impact |
|----|-------|-----------|--------|
| DB-01 | **Migration 116 `response_id` FK defect** — adds FK `fk_transcripts_response` referencing `evaluation.responses(id)` on column `response_id`, but `response_id` column is never defined in migration 016 | `116_interview_transcript_fk.sql` | FK application may fail; `session.interview_transcripts` has no `response_id` column |
| DB-02 | **`session.question_bank` vs `session.question_bank_items`** — `interview.routes.ts` bank-fallback may reference `session.question_bank` (different from `session.question_bank_items`); only the latter is created by migration | `035_session_question_bank_items.sql` | Bank-fallback silently returns empty on non-existent table (caught in `.catch()`) |
| DB-03 | **`placement.checklist_items` never seeded** — migration 106 is a placeholder | `106_seed_checklist_items.sql` | No checklist items exist until created via API |
| DB-04 | **`agent` schema has no tables** — created in 002 but no migrations define tables for it | `002_schemas.sql` | Reserved for future use; not blocking |
