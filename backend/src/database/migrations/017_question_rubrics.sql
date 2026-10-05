-- Migration 017: per-turn question rubric storage
-- One row per (session_id, turn_number).
-- Written twice per question lifecycle:
--   1. INSERT when the question is generated (rubric set, scores null)
--   2. UPDATE when the answer is evaluated (scores + feedback filled in)
-- The UPSERT pattern handles both writes idempotently.

CREATE TABLE IF NOT EXISTS session.question_rubrics (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID        NOT NULL,
    turn_number     INTEGER     NOT NULL,
    question_text   TEXT        NOT NULL,
    rubric          JSONB       NOT NULL DEFAULT '{}',
    technical_score NUMERIC(5,2),
    feedback        TEXT,
    evaluated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_rubric_session_turn UNIQUE (session_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_question_rubrics_session
    ON session.question_rubrics (session_id);
