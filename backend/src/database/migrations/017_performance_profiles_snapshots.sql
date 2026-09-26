-- performance.performance_profiles  (DBML §15)
CREATE TABLE performance.performance_profiles (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID        NOT NULL UNIQUE REFERENCES org.students(id) ON DELETE CASCADE,
  technical_score        NUMERIC,
  communication_score    NUMERIC,
  listening_score        NUMERIC,
  overall_score          NUMERIC,
  previous_overall_score NUMERIC,
  trend                  VARCHAR,           -- nullable per DBML
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- performance.performance_snapshots  (DBML §15)
-- attempt_id (not session_id) per DBML.
-- program_id and batch_id are NOT NULL per DBML.
CREATE TABLE performance.performance_snapshots (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  attempt_id          UUID        NOT NULL,   -- FK to assessment.assessment_attempts added after that table exists
  program_id          UUID        NOT NULL,
  batch_id            UUID        NOT NULL,
  subdivision_id      UUID,
  technical_score     NUMERIC,
  communication_score NUMERIC,
  listening_score     NUMERIC,
  overall_score       NUMERIC,
  component_scores    JSONB,
  skill_scores        JSONB,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_perf_snapshots_student_captured ON performance.performance_snapshots (student_id, captured_at);
CREATE INDEX idx_perf_snapshots_org              ON performance.performance_snapshots (program_id, batch_id, subdivision_id);
