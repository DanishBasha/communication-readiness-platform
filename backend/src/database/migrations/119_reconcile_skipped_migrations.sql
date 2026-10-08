-- Reconciliation for databases where the second-generation migrations (031-043,
-- 061-069, 091-099) failed with "already exists" or were marked applied by
-- repair-migration-tracker.ts without running. Their extra columns, indexes,
-- triggers and foreign keys are (re)applied here. Every statement is idempotent,
-- so this is a no-op on a database built from scratch.

-- ── Columns the second-generation table definitions add ─────────────────────
ALTER TABLE session.question_bank_items      ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE performance.performance_profiles ADD COLUMN IF NOT EXISTS assessment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE performance.performance_profiles ADD COLUMN IF NOT EXISTS last_assessment_at TIMESTAMPTZ;
ALTER TABLE knowledge.knowledge_chunks       ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE credit.credit_policies           ADD COLUMN IF NOT EXISTS policy_key VARCHAR(100) UNIQUE;
ALTER TABLE placement.checklist_progress     ADD COLUMN IF NOT EXISTS completion_evidence TEXT;
ALTER TABLE placement.checklist_progress     ADD COLUMN IF NOT EXISTS is_mentor_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE placement.placement_eligibility  ADD COLUMN IF NOT EXISTS blocking_reasons JSONB;

-- ── from 042_m2_indexes.sql ──────────────────────────────────────────
-- M2: performance indexes for all M2 tables

-- assessment_attempts
CREATE INDEX IF NOT EXISTS idx_attempts_student_id         ON assessment.assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment_id      ON assessment.assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_status     ON assessment.assessment_attempts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_program_batch      ON assessment.assessment_attempts(program_id, batch_id);

-- assessment_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_attempt_id         ON session.assessment_sessions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state              ON session.assessment_sessions(state);

-- questions
CREATE INDEX IF NOT EXISTS idx_questions_attempt_id        ON session.questions(attempt_id);

-- responses
CREATE INDEX IF NOT EXISTS idx_responses_attempt_id        ON evaluation.responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id       ON evaluation.responses(question_id);

-- ai_runs
CREATE INDEX IF NOT EXISTS idx_ai_runs_response_id         ON evaluation.ai_runs(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_status              ON evaluation.ai_runs(status);

-- response_evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_response_id     ON evaluation.response_evaluations(response_id);

-- assessment_reports
CREATE INDEX IF NOT EXISTS idx_reports_student_id          ON performance.assessment_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_reports_attempt_id          ON performance.assessment_reports(attempt_id);

-- question_bank_items
CREATE INDEX IF NOT EXISTS idx_qbi_difficulty_active       ON session.question_bank_items(difficulty, is_active);

-- ── from 043_m2_updated_at_triggers.sql ──────────────────────────────
-- M2: updated_at auto-update triggers for session tables
-- Reuses the trigger function created in migration 015 (M1).

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON assessment.assessments;
CREATE TRIGGER trg_assessments_updated_at
    BEFORE UPDATE ON assessment.assessments
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_assessment_sessions_updated_at ON session.assessment_sessions;
CREATE TRIGGER trg_assessment_sessions_updated_at
    BEFORE UPDATE ON session.assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_question_bank_items_updated_at ON session.question_bank_items;
CREATE TRIGGER trg_question_bank_items_updated_at
    BEFORE UPDATE ON session.question_bank_items
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ── from 068_m3_indexes.sql ──────────────────────────────────────────
-- M3: indexes for performance and knowledge schemas

-- performance.skills
CREATE INDEX IF NOT EXISTS idx_skills_category_active ON performance.skills (category) WHERE is_active = TRUE;

-- performance.performance_profiles
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON performance.performance_profiles (student_id);

-- performance.performance_snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_student_captured ON performance.performance_snapshots (student_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_attempt_id       ON performance.performance_snapshots (attempt_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_program_batch    ON performance.performance_snapshots (program_id, batch_id, subdivision_id);

-- performance.skill_performances
CREATE INDEX IF NOT EXISTS idx_skill_perf_student_skill ON performance.skill_performances (student_id, skill_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_perf_skill_at      ON performance.skill_performances (skill_id, measured_at DESC);

-- performance.listening_stories
CREATE INDEX IF NOT EXISTS idx_listening_stories_active ON performance.listening_stories (difficulty) WHERE is_active = TRUE;

-- knowledge.knowledge_chunks — IVFFlat approximate nearest-neighbour for cosine similarity
-- lists=100 is appropriate for up to ~1M chunks; tune after initial data load.
DO $$
BEGIN
  -- ivfflat requires a fixed-dimension column (vector(n)); migration 019 may have
  -- created the column as an unconstrained `vector`, in which case skip the index.
  IF (SELECT atttypmod FROM pg_attribute
      WHERE attrelid = 'knowledge.knowledge_chunks'::regclass AND attname = 'embedding') > 0 THEN
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
      ON knowledge.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;

-- ── from 069_m3_updated_at_triggers.sql ──────────────────────────────
-- M3: updated_at auto-update triggers for mutable performance/knowledge tables
-- Reuses the trigger function created in migration 015 (M1).

DROP TRIGGER IF EXISTS trg_skills_updated_at ON performance.skills;
CREATE TRIGGER trg_skills_updated_at
    BEFORE UPDATE ON performance.skills
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_performance_profiles_updated_at ON performance.performance_profiles;
CREATE TRIGGER trg_performance_profiles_updated_at
    BEFORE UPDATE ON performance.performance_profiles
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_listening_stories_updated_at ON performance.listening_stories;
CREATE TRIGGER trg_listening_stories_updated_at
    BEFORE UPDATE ON performance.listening_stories
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_documents_updated_at ON knowledge.knowledge_documents;
CREATE TRIGGER trg_knowledge_documents_updated_at
    BEFORE UPDATE ON knowledge.knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ── from 098_m4_indexes.sql ──────────────────────────────────────────
-- M4: indexes for credit and placement schemas

-- credit.credit_accounts
CREATE INDEX IF NOT EXISTS idx_credit_accounts_student ON credit.credit_accounts (student_id);

-- credit.credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_txn_account_id   ON credit.credit_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_credit_txn_student_at   ON credit.credit_transactions (student_id, created_at DESC);

-- credit.credit_policies
CREATE INDEX IF NOT EXISTS idx_credit_policies_scope   ON credit.credit_policies (scope_type) WHERE is_active = TRUE;

-- placement.checklist_items
CREATE INDEX IF NOT EXISTS idx_checklist_items_program ON placement.checklist_items (program_id, subdivision_id);

-- placement.checklist_progress
CREATE INDEX IF NOT EXISTS idx_checklist_prog_student  ON placement.checklist_progress (student_id, status);
CREATE INDEX IF NOT EXISTS idx_checklist_prog_item     ON placement.checklist_progress (checklist_item_id);

-- placement.mentor_verifications
CREATE INDEX IF NOT EXISTS idx_mentor_verif_student    ON placement.mentor_verifications (student_id, verification_type);
CREATE INDEX IF NOT EXISTS idx_mentor_verif_mentor     ON placement.mentor_verifications (mentor_user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_verif_progress   ON placement.mentor_verifications (checklist_progress_id);

-- placement.placement_eligibility
CREATE INDEX IF NOT EXISTS idx_placement_elig_student  ON placement.placement_eligibility (student_id);

-- ── from 099_m4_updated_at_triggers.sql ──────────────────────────────
-- M4: updated_at auto-update triggers for credit and placement tables
-- Reuses the trigger function created in migration 015 (M1).

DROP TRIGGER IF EXISTS trg_credit_accounts_updated_at ON credit.credit_accounts;
CREATE TRIGGER trg_credit_accounts_updated_at
    BEFORE UPDATE ON credit.credit_accounts
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_credit_policies_updated_at ON credit.credit_policies;
CREATE TRIGGER trg_credit_policies_updated_at
    BEFORE UPDATE ON credit.credit_policies
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_items_updated_at ON placement.checklist_items;
CREATE TRIGGER trg_checklist_items_updated_at
    BEFORE UPDATE ON placement.checklist_items
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_checklist_progress_updated_at ON placement.checklist_progress;
CREATE TRIGGER trg_checklist_progress_updated_at
    BEFORE UPDATE ON placement.checklist_progress
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_mentor_verifications_updated_at ON placement.mentor_verifications;
CREATE TRIGGER trg_mentor_verifications_updated_at
    BEFORE UPDATE ON placement.mentor_verifications
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

DROP TRIGGER IF EXISTS trg_placement_eligibility_updated_at ON placement.placement_eligibility;
CREATE TRIGGER trg_placement_eligibility_updated_at
    BEFORE UPDATE ON placement.placement_eligibility
    FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

-- ── from 115_shared_fks.sql ──────────────────────────────────────────
-- Shared FK migration: cross-schema foreign key constraints deferred from individual module migrations.
-- Run AFTER all module migrations (001–109) have been applied.
-- All referenced tables must exist before this migration runs.

-- ─── M3: performance schema ────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE performance.performance_profiles
      ADD CONSTRAINT fk_profiles_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE performance.performance_snapshots
      ADD CONSTRAINT fk_snapshots_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE performance.performance_snapshots
      ADD CONSTRAINT fk_snapshots_attempt
      FOREIGN KEY (attempt_id) REFERENCES assessment.assessment_attempts(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE performance.skill_performances
      ADD CONSTRAINT fk_skill_perf_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE performance.skill_performances
      ADD CONSTRAINT fk_skill_perf_attempt
      FOREIGN KEY (attempt_id) REFERENCES assessment.assessment_attempts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Deferred M2 FKs (tables existed before M3 ran) ───────────────────────

-- session.question_bank_item_skills.skill_id — FK omitted in migration 036;
-- performance.skills (M3) didn't exist yet when M2 migrations ran.
DO $$ BEGIN
  ALTER TABLE session.question_bank_item_skills
      ADD CONSTRAINT fk_qbis_skill
      FOREIGN KEY (skill_id) REFERENCES performance.skills(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- session.questions.listening_story_id — FK omitted in migration 037;
-- performance.listening_stories (M3) didn't exist yet when M2 migrations ran.
DO $$ BEGIN
  ALTER TABLE session.questions
      ADD CONSTRAINT fk_questions_listening_story
      FOREIGN KEY (listening_story_id) REFERENCES performance.listening_stories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- session.questions.primary_skill_id — FK omitted in migration 037;
-- performance.skills (M3) didn't exist yet when M2 migrations ran.
DO $$ BEGIN
  ALTER TABLE session.questions
      ADD CONSTRAINT fk_questions_primary_skill
      FOREIGN KEY (primary_skill_id) REFERENCES performance.skills(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── M4: credit schema ─────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE credit.credit_accounts
      ADD CONSTRAINT fk_credit_accounts_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE credit.credit_transactions
      ADD CONSTRAINT fk_credit_txn_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── M4: placement schema ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE placement.checklist_items
      ADD CONSTRAINT fk_checklist_items_program
      FOREIGN KEY (program_id) REFERENCES org.programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE placement.checklist_items
      ADD CONSTRAINT fk_checklist_items_subdivision
      FOREIGN KEY (subdivision_id) REFERENCES org.subdivisions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE placement.checklist_progress
      ADD CONSTRAINT fk_checklist_progress_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE placement.mentor_verifications
      ADD CONSTRAINT fk_mentor_verif_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE placement.mentor_verifications
      ADD CONSTRAINT fk_mentor_verif_mentor_user
      FOREIGN KEY (mentor_user_id) REFERENCES identity.users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE placement.placement_eligibility
      ADD CONSTRAINT fk_placement_elig_student
      FOREIGN KEY (student_id) REFERENCES org.students(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
