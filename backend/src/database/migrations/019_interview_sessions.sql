-- Migration 019: interview_sessions (single-row-per-session state table)
-- Drops the orphaned question_rubrics table (rubric now lives inside interview_state JSONB).
-- Creates interview_sessions: one row per session, updated in-place via checkpoint writes.

DROP TABLE IF EXISTS session.question_rubrics;

CREATE TABLE IF NOT EXISTS session.interview_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active | completed | abandoned
    interview_state JSONB       NOT NULL DEFAULT '{}',     -- full Redis state blob
    overall_score   NUMERIC(5,2),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_student
    ON session.interview_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status
    ON session.interview_sessions (status);
