# Data Migration & Seeding Plan

> **Source of truth:** `backend/src/database/migrations/` (001–123) and `backend/src/database/migrate.ts`  
> **Branch:** `feature/new-ui-backend-integration`  
> **Audited:** 2026-09-28

---

## Table of Contents

1. [Migration Runner](#1-migration-runner)
2. [Migration Ordering](#2-migration-ordering)
3. [Migration Inventory by Module](#3-migration-inventory-by-module)
4. [Seed Data](#4-seed-data)
5. [Cross-Migration Dependencies](#5-cross-migration-dependencies)
6. [Adding a New Migration](#6-adding-a-new-migration)
7. [Production Migration Procedure](#7-production-migration-procedure)
8. [Known Issues](#8-known-issues)

---

## 1. Migration Runner

**File:** `backend/src/database/migrate.ts`

- Connects to PostgreSQL using `DATABASE_URL` env var
- Bootstraps `system.schema` and `system.migrations` tracking table on first run
- Applies each `.sql` file in `backend/src/database/migrations/` **in alphabetical filename order**
- Each migration file runs in a single `BEGIN/COMMIT` transaction
- Applied migrations are recorded in `system.migrations` — already-applied files are skipped
- SSL enabled when `NODE_ENV !== 'development'`

```bash
# Run migrations
cd backend
npm run migrate
```

---

## 2. Migration Ordering

Files are sorted **alphabetically**. The numeric prefix controls execution order. The actual execution sequence:

```
001 → 002 → 003 → ... → 016 → 031 → 032 → ... → 043 →
061 → ... → 069 → 080 →
091 → ... → 099 → 105 → 106 →
115 → 116 → 120 → 121 → 122 → 123
```

All inter-file dependencies are satisfied by this order. Key ordering constraints:
- Extensions (001) before schemas (002) before tables (003+)
- `016_session_transcripts.sql` runs before M2 tables (031+); FK to sessions deferred to 116
- `115_shared_fks.sql` runs after all module tables are created
- `116_interview_transcript_fk.sql` runs after 034 (assessment_sessions) and 038 (responses)
- `120–123` run after all relevant target tables exist

---

## 3. Migration Inventory by Module

### Infrastructure & M1 (001–016)

| File | Description |
|------|-------------|
| `001_extensions.sql` | Enable uuid-ossp, pgcrypto, pg_trgm |
| `002_schemas.sql` | Create all 11 DB schemas |
| `003_identity_users.sql` | identity.users; user_role enum; user_status enum |
| `004_system_audit_logs.sql` | system.audit_logs |
| `005_org_institutions.sql` | org.institutions |
| `006_org_programs.sql` | org.programs |
| `007_org_batches.sql` | org.batches; student_track enum |
| `008_org_subdivisions.sql` | org.subdivisions |
| `009_org_students.sql` | org.students |
| `010_org_faculty_profiles.sql` | org.faculty_profiles |
| `011_org_trainer_subdivision_assignments.sql` | org.trainer_subdivision_assignments |
| `012_org_student_mentor_assignments.sql` | org.student_mentor_assignments |
| `013_identity_indexes.sql` | Indexes on identity.users, system.audit_logs |
| `014_org_indexes.sql` | Indexes on all org tables |
| `015_updated_at_triggers.sql` | system.set_updated_at() function + triggers on users, students |
| `016_session_transcripts.sql` | session.interview_transcripts (FK to students; session FK deferred) |

### M2 — Assessment Engine (031–043)

| File | Description |
|------|-------------|
| `031_assessment_assessments.sql` | assessment.assessments; enables vector extension |
| `032_assessment_components.sql` | assessment.assessment_components |
| `033_assessment_attempts.sql` | assessment.assessment_attempts |
| `034_session_assessment_sessions.sql` | session.assessment_sessions (UNIQUE → attempts) |
| `035_session_question_bank_items.sql` | session.question_bank_items (embedding VECTOR(1536)) |
| `036_session_question_bank_item_skills.sql` | session.question_bank_item_skills |
| `037_session_questions.sql` | session.questions |
| `038_evaluation_responses.sql` | evaluation.responses (idempotency_key UNIQUE) |
| `039_evaluation_ai_runs.sql` | evaluation.ai_runs |
| `040_evaluation_response_evaluations.sql` | evaluation.response_evaluations |
| `041_performance_assessment_reports.sql` | performance.assessment_reports (UNIQUE → attempts) |
| `042_m2_indexes.sql` | Indexes for all M2 tables |
| `043_m2_updated_at_triggers.sql` | Triggers on assessments, sessions, question_bank_items |

### M3 — Performance & Knowledge (061–069, 080)

| File | Description |
|------|-------------|
| `061_performance_skills.sql` | performance.skills |
| `062_performance_profiles.sql` | performance.performance_profiles (never written — M3 not impl.) |
| `063_performance_snapshots.sql` | performance.performance_snapshots |
| `064_performance_skill_performances.sql` | performance.skill_performances |
| `065_performance_listening_stories.sql` | performance.listening_stories |
| `066_knowledge_documents.sql` | knowledge.knowledge_documents |
| `067_knowledge_chunks.sql` | knowledge.knowledge_chunks (embedding VECTOR(1536); CASCADE FK) |
| `068_m3_indexes.sql` | Indexes including IVFFlat for knowledge_chunks |
| `069_m3_updated_at_triggers.sql` | Triggers on skills, performance_profiles, listening_stories, docs |
| `080_seed_skills.sql` | **SEED** — Inserts 21 skills (ON CONFLICT DO NOTHING) |

### M4 — Credits & Placement (091–099, 105–106)

| File | Description |
|------|-------------|
| `091_credit_accounts.sql` | credit.credit_accounts (balance CHECK ≥ 0) |
| `092_credit_transactions.sql` | credit.credit_transactions (append-only; idempotency UNIQUE) |
| `093_credit_policies.sql` | credit.credit_policies |
| `094_checklist_items.sql` | placement.checklist_items |
| `095_checklist_progress.sql` | placement.checklist_progress |
| `096_mentor_verifications.sql` | placement.mentor_verifications |
| `097_placement_eligibility.sql` | placement.placement_eligibility (student_id UNIQUE) |
| `098_m4_indexes.sql` | Indexes for all M4 tables |
| `099_m4_updated_at_triggers.sql` | Triggers on all M4 tables |
| `105_seed_credit_policies.sql` | **SEED** — Inserts GLOBAL_DEFAULT policy (ON CONFLICT DO NOTHING) |
| `106_seed_checklist_items.sql` | Placeholder — no data; reserved for CSV import via API |

### Shared FKs & Late Schema Additions (115–123)

| File | Description |
|------|-------------|
| `115_shared_fks.sql` | All deferred cross-schema FKs (M3 → M1, M4 → M1, M2 → M3) |
| `116_interview_transcript_fk.sql` | FK session_id → session.assessment_sessions CASCADE; FK response_id → evaluation.responses SET NULL (⚠️ defect — see §8) |
| `120_org_sub_programs.sql` | org.sub_programs |
| `121_org_student_programs.sql` | org.student_programs |
| `122_assessment_targeting.sql` | ADD COLUMNS target_program_id, target_sub_program_id to assessment.assessments |
| `123_student_track_import.sql` | ADD ENUM VALUE 'IMPORT' to student_track |

---

## 4. Seed Data

Seed migrations use `ON CONFLICT DO NOTHING` — safe to re-run.

### Skills (migration 080)

21 rows inserted into `performance.skills`:
- 7 TECHNICAL skills
- 6 COMMUNICATION skills
- 5 BEHAVIORAL skills
- 3 DOMAIN_SPECIFIC skills

These are used as FK targets by `session.question_bank_item_skills` when adding questions to the question bank.

### Credit Policy (migration 105)

1 row inserted into `credit.credit_policies`:

| Field | Value |
|-------|-------|
| `scope_type` | `GLOBAL` |
| `name` | `GLOBAL_DEFAULT` |
| `is_active` | true |
| `initial_credit_amount` | 50 |
| `consume_amount` | 10 |
| `max_balance` | 200 |

This is the only policy row. All credit operations (registration initial balance, attempt deduction, completion earn) read from this policy.

**Important:** `consume_amount` (10) is also used as the earn amount after attempt completion — there is no separate `earn_amount` column.

### Checklist Items (migration 106)

Placeholder only. No rows. Checklist items must be created via:
- `POST /api/checklist` (individual)
- `POST /api/checklist/import-csv` (bulk JSON array)

---

## 5. Cross-Migration Dependencies

The deferred FK pattern is used to avoid circular references between modules:

```
016_session_transcripts → has student_id FK immediately
                        → session_id FK deferred to 116 (needs M2's session table)
                        → response_id FK deferred to 116 (needs M2's responses table)

036_question_bank_item_skills → skill_id FK deferred to 115 (needs M3's skills table)

062_performance_profiles → student_id FK deferred to 115 (needs M1's students table)

091_credit_accounts → student_id FK deferred to 115 (needs M1's students table)

094_checklist_items → program_id, subdivision_id FKs deferred to 115

etc.
```

All deferred FKs are resolved in `115_shared_fks.sql` and `116_interview_transcript_fk.sql`.

---

## 6. Adding a New Migration

1. Choose a filename with the next available number prefix:
   - M1 additions: use `01x_` range (next available after 016)
   - M2 additions: use `04x_` through `05x_`
   - M3 additions: use `07x_` through `07x_`
   - M4 additions: use `10x_` through `11x_`
   - Shared/late additions: use `12x_` and above

2. File naming: `NNN_descriptive_name.sql` — use underscores, all lowercase

3. Write idempotent SQL where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

4. If adding a column to an existing table, use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

5. Do NOT edit existing migration files — they are immutable once applied

6. Test locally with `npm run migrate`; verify `system.migrations` contains the new filename

---

## 7. Production Migration Procedure

1. **Backup the database** before running migrations in production

2. Review the migration files to be applied (`SELECT filename FROM system.migrations` to see what's already applied)

3. Run migrations:
   ```bash
   NODE_ENV=production DATABASE_URL=<prod-url> npm run migrate
   ```

4. Verify no errors in migration output

5. Spot-check a newly created table:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = '<expected-schema>'
   ORDER BY table_name;
   ```

6. For `ADD ENUM VALUE` migrations (like 123): PostgreSQL requires a new transaction after `ALTER TYPE ... ADD VALUE` — these migrations cannot be rolled back.

---

## 8. Known Issues

| ID | File | Issue | Impact |
|----|------|-------|--------|
| MIG-01 | `116_interview_transcript_fk.sql` | Adds FK `fk_transcripts_response` on column `response_id` referencing `evaluation.responses(id)` — but `response_id` column does not exist in `session.interview_transcripts` (migration 016 never defined it) | FK creation may fail; `session.interview_transcripts.response_id` column is missing |
| MIG-02 | `106_seed_checklist_items.sql` | Placeholder — no seed data | No checklist items exist at startup; must be created via API |
| MIG-03 | `002_schemas.sql` | `agent` schema created but no tables defined in any migration | Reserved; not blocking |
