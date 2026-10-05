-- Migration 118: retrieval-speed indices for high-traffic query patterns
-- Covers gaps left by earlier index migrations (013, 014, 042, 068, 098, 117).
-- All use IF NOT EXISTS so re-running is safe.

-- ── system.audit_logs ────────────────────────────────────────────────────────
-- Time-ordered listing (admin dashboards, compliance exports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON system.audit_logs (created_at DESC);

-- Resource-scoped lookup ("show all audit events for this session / user")
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON system.audit_logs (resource_type, resource_id);

-- ── credit.credit_transactions ───────────────────────────────────────────────
-- Type-filtered ledger view (EARN / CONSUME / REFUND breakdown per student)
CREATE INDEX IF NOT EXISTS idx_credit_txn_type_at
    ON credit.credit_transactions (transaction_type, created_at DESC);

-- Reverse lookup: find all transactions that reference a specific attempt / session
CREATE INDEX IF NOT EXISTS idx_credit_txn_reference
    ON credit.credit_transactions (reference_type, reference_id);

-- ── credit.credit_policies ───────────────────────────────────────────────────
-- Hierarchical policy resolution: PROGRAM → SUBDIVISION → STUDENT scope lookups
CREATE INDEX IF NOT EXISTS idx_credit_policies_program
    ON credit.credit_policies (scope_type, program_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_credit_policies_subdivision
    ON credit.credit_policies (scope_type, subdivision_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_credit_policies_student
    ON credit.credit_policies (scope_type, student_id)
    WHERE is_active = TRUE;

-- ── assessment.assessment_attempts ──────────────────────────────────────────
-- Student history sorted by recency ("show my last 10 attempts")
CREATE INDEX IF NOT EXISTS idx_attempts_student_started
    ON assessment.assessment_attempts (student_id, started_at DESC);

-- Cohort-level listing with recency sort (coordinator dashboards)
CREATE INDEX IF NOT EXISTS idx_attempts_batch_started
    ON assessment.assessment_attempts (program_id, batch_id, started_at DESC);

-- Completed-only filter for report aggregation
CREATE INDEX IF NOT EXISTS idx_attempts_completed_at
    ON assessment.assessment_attempts (completed_at DESC)
    WHERE status = 'COMPLETED';

-- ── session.interview_sessions ───────────────────────────────────────────────
-- Student's recent sessions sorted by last activity
CREATE INDEX IF NOT EXISTS idx_interview_sessions_student_updated
    ON session.interview_sessions (student_id, updated_at DESC);

-- ── placement.checklist_items ────────────────────────────────────────────────
-- Required-only filter for eligibility evaluation
CREATE INDEX IF NOT EXISTS idx_checklist_items_required_active
    ON placement.checklist_items (program_id, is_required, is_active);

-- ── placement.checklist_progress ─────────────────────────────────────────────
-- Point lookup: has student X completed checklist item Y?
-- (existing indices cover student+status and item separately — this covers the join)
CREATE INDEX IF NOT EXISTS idx_checklist_prog_student_item
    ON placement.checklist_progress (student_id, checklist_item_id);

-- ── performance.assessment_reports ───────────────────────────────────────────
-- Recent reports per student (program_id lives on the attempt row, joined via attempt_id)
CREATE INDEX IF NOT EXISTS idx_reports_student_created
    ON performance.assessment_reports (student_id, created_at DESC);

-- ── evaluation.ai_runs ───────────────────────────────────────────────────────
-- Recent failed runs for debugging / retry monitoring
CREATE INDEX IF NOT EXISTS idx_ai_runs_status_created
    ON evaluation.ai_runs (status, created_at DESC)
    WHERE status = 'FAILED';
