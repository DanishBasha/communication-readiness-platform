-- performance.learning_plans  (DBML §16)
-- generated_by_agent_run_id (not agent_run_id).
-- plan_data jsonb holds the entire plan structure.
-- version int per DBML.
CREATE TABLE performance.learning_plans (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  generated_by_agent_run_id UUID,             -- FK to agent.agent_runs added after that table exists
  goal                     TEXT,
  plan_data                JSONB,
  status                   VARCHAR,
  version                  INTEGER,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_plans_student ON performance.learning_plans (student_id);


-- performance.learning_recommendations  (DBML §16)
-- source_attempt_id, evidence, status (not is_active), updated_at per DBML.
CREATE TABLE performance.learning_recommendations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  learning_plan_id    UUID        REFERENCES performance.learning_plans(id) ON DELETE SET NULL,
  source_attempt_id   UUID,               -- FK to assessment_attempts added later
  skill_id            UUID        REFERENCES performance.skills(id) ON DELETE SET NULL,
  recommendation_type VARCHAR,
  title               VARCHAR,
  description         TEXT,
  priority            INTEGER,
  evidence            JSONB,
  status              VARCHAR,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_recs_student ON performance.learning_recommendations (student_id);
