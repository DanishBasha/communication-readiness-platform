-- ── Session tables ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_interview_sessions_student_id
  ON session.interview_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status
  ON session.interview_sessions (status);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_student_status
  ON session.interview_sessions (student_id, status);

CREATE INDEX IF NOT EXISTS idx_interview_transcripts_session_id
  ON session.interview_transcripts (session_id);

CREATE INDEX IF NOT EXISTS idx_interview_transcripts_student_id
  ON session.interview_transcripts (student_id);

CREATE INDEX IF NOT EXISTS idx_interview_embeddings_session_id
  ON session.interview_embeddings (session_id);

-- ── Attempt race-condition guard ───────────────────────────────────────────────
-- Enforces at most one IN_PROGRESS attempt per student per assessment at the DB level.
-- The partial index only covers IN_PROGRESS rows so completed/abandoned rows are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS idx_attempts_one_active
  ON assessment.assessment_attempts (student_id, assessment_id)
  WHERE status = 'IN_PROGRESS';
