-- assessment.assessments  (DBML §7)
CREATE TABLE assessment.assessments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR,
  assessment_type VARCHAR,
  interview_type  VARCHAR,
  version         INTEGER     NOT NULL DEFAULT 1,
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_assessments_id_version ON assessment.assessments (id, version);


-- assessment.assessment_components  (DBML §7)
CREATE TABLE assessment.assessment_components (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID        NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
  component_type VARCHAR,
  name           VARCHAR,
  weight         NUMERIC,
  configuration  JSONB,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_assessment_component_type
  ON assessment.assessment_components (assessment_id, component_type);


-- assessment.assessment_attempts  (DBML §8)
-- Includes immutable org snapshot columns + scoring metadata.
CREATE TABLE assessment.assessment_attempts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id           UUID        NOT NULL REFERENCES assessment.assessments(id),
  student_id              UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  interview_type          VARCHAR,
  conducted_event_key     VARCHAR,
  program_id              UUID        NOT NULL REFERENCES org.programs(id),
  batch_id                UUID        NOT NULL REFERENCES org.batches(id),
  subdivision_id          UUID        REFERENCES org.subdivisions(id),
  assessment_version      INTEGER,
  scoring_version         VARCHAR,
  configuration_snapshot  JSONB,
  credit_policy_snapshot  JSONB,
  status                  VARCHAR,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_student_assessment  ON assessment.assessment_attempts (student_id, assessment_id);
CREATE INDEX idx_attempts_student_status      ON assessment.assessment_attempts (student_id, status);
CREATE INDEX idx_attempts_org                 ON assessment.assessment_attempts (program_id, batch_id, subdivision_id);
CREATE INDEX idx_attempts_conducted_key       ON assessment.assessment_attempts (student_id, conducted_event_key);


-- session.assessment_sessions  (DBML §8)
CREATE TABLE session.assessment_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID        NOT NULL UNIQUE REFERENCES assessment.assessment_attempts(id) ON DELETE CASCADE,
  current_sequence_no INTEGER,
  state             VARCHAR,
  state_data        JSONB,
  last_activity_at  TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now that assessment_attempts exists, add deferred FKs to M3 tables
ALTER TABLE performance.performance_snapshots
  ADD CONSTRAINT fk_perf_snapshot_attempt
  FOREIGN KEY (attempt_id) REFERENCES assessment.assessment_attempts(id);

ALTER TABLE performance.skill_performances
  ADD CONSTRAINT fk_skill_perf_attempt
  FOREIGN KEY (attempt_id) REFERENCES assessment.assessment_attempts(id);

ALTER TABLE performance.learning_recommendations
  ADD CONSTRAINT fk_learning_rec_source_attempt
  FOREIGN KEY (source_attempt_id) REFERENCES assessment.assessment_attempts(id);
