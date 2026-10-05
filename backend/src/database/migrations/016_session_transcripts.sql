-- Migration 016: per-turn interview transcript storage
-- The session.interview_transcripts table captures every question+answer turn
-- from a live interview session. It is written by Node.js (via SessionContextService.flushToDb)
-- after the Redis context is flushed.
--
-- NOTE: session_id intentionally has NO FOREIGN KEY yet. The parent table
-- session.assessment_sessions is created in Module 2 migrations (031+). Once those
-- migrations run, add the FK with:
--   ALTER TABLE session.interview_transcripts
--     ADD CONSTRAINT fk_transcripts_session
--     FOREIGN KEY (session_id) REFERENCES session.assessment_sessions(id);
-- The index on session_id is already in place so queries are fast without the FK.

CREATE TABLE IF NOT EXISTS session.interview_transcripts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL,
    -- FK to session.assessment_sessions(id) — intentionally deferred until M2 migrations run
    student_id  UUID        NOT NULL REFERENCES org.students(id),
    turn_number INTEGER     NOT NULL,
    question    TEXT        NOT NULL,
    answer      TEXT        NOT NULL,
    difficulty  VARCHAR(20) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'ADVANCED')),
    stt_raw     TEXT,               -- raw Whisper transcript before any cleaning
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Idempotency: prevent duplicate flush inserts
    CONSTRAINT uq_transcript_session_turn UNIQUE (session_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_interview_transcripts_session
    ON session.interview_transcripts (session_id);

CREATE INDEX IF NOT EXISTS idx_interview_transcripts_student
    ON session.interview_transcripts (student_id);
