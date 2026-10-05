-- evaluation.responses  (DBML §11)
CREATE TABLE evaluation.responses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       UUID        NOT NULL REFERENCES assessment.assessment_attempts(id) ON DELETE CASCADE,
  question_id      UUID        NOT NULL REFERENCES session.questions(id) ON DELETE CASCADE,
  input_type       VARCHAR,
  text_answer      TEXT,
  transcript       TEXT,
  idempotency_key  VARCHAR     NOT NULL,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_responses_idempotency     ON evaluation.responses (idempotency_key);
CREATE UNIQUE INDEX uq_responses_attempt_question ON evaluation.responses (attempt_id, question_id);


-- evaluation.ai_runs  (DBML §12)
CREATE TABLE evaluation.ai_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id       UUID        REFERENCES evaluation.responses(id),
  capability        VARCHAR,
  provider          VARCHAR,
  model             VARCHAR,
  prompt_version    VARCHAR,
  input_hash        VARCHAR,
  request_metadata  JSONB,
  response_metadata JSONB,
  status            VARCHAR,
  latency_ms        INTEGER,
  token_usage       JSONB,
  error_code        VARCHAR,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);


-- evaluation.response_evaluations  (DBML §13)
CREATE TABLE evaluation.response_evaluations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id          UUID        NOT NULL UNIQUE REFERENCES evaluation.responses(id),
  ai_run_id            UUID        NOT NULL REFERENCES evaluation.ai_runs(id),
  technical_score      NUMERIC,
  communication_score  NUMERIC,
  listening_score      NUMERIC,
  confidence           NUMERIC,
  strengths            JSONB,
  weaknesses           JSONB,
  feedback             TEXT,
  dimension_scores     JSONB,
  communication_metrics JSONB,
  listening_metrics    JSONB,
  evaluation_version   VARCHAR,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- performance.assessment_reports  (DBML §14)
-- Immutable after creation — one per attempt.
CREATE TABLE performance.assessment_reports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id              UUID        NOT NULL UNIQUE REFERENCES assessment.assessment_attempts(id),
  student_id              UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  assessment_version      INTEGER,
  scoring_version         VARCHAR,
  technical_score         NUMERIC,
  communication_score     NUMERIC,
  listening_score         NUMERIC,
  overall_score           NUMERIC,
  component_scores        JSONB,
  skill_scores            JSONB,
  strengths               JSONB,
  weaknesses              JSONB,
  feedback                TEXT,
  recommendations_snapshot JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_reports_student ON performance.assessment_reports (student_id);
