-- agent.agent_definitions  (DBML §20)
-- DBML columns: name, version, goal, tools, guardrails, prohibited_actions,
-- termination_conditions, max_steps, max_tool_calls, max_retries,
-- timeout_seconds, is_active.
-- Unique on (name, version).
CREATE TABLE agent.agent_definitions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR     NOT NULL,
  version               INTEGER     NOT NULL DEFAULT 1,
  goal                  TEXT,
  tools                 JSONB,
  guardrails            JSONB,
  prohibited_actions    JSONB,
  termination_conditions JSONB,
  max_steps             INTEGER,
  max_tool_calls        INTEGER,
  max_retries           INTEGER,
  timeout_seconds       INTEGER,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_agent_def_name_version ON agent.agent_definitions (name, version);


-- agent.agent_runs  (DBML §20)
-- triggered_by_user_id (nullable), goal_snapshot text, correlation_id varchar,
-- started_at. No goal, no learning_plan_id, no updated_at per DBML.
CREATE TABLE agent.agent_runs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_definition_id   UUID        NOT NULL REFERENCES agent.agent_definitions(id),
  student_id            UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  triggered_by_user_id  UUID        REFERENCES identity.users(id),
  status                VARCHAR,
  goal_snapshot         TEXT,
  termination_reason    VARCHAR,
  correlation_id        VARCHAR,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_student ON agent.agent_runs (student_id);


-- agent.agent_steps  (DBML §20)
-- sequence_no (not sequence), error_code + error_message (not single error).
CREATE TABLE agent.agent_steps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id  UUID        NOT NULL REFERENCES agent.agent_runs(id) ON DELETE CASCADE,
  sequence_no   INTEGER     NOT NULL,
  step_type     VARCHAR,
  tool_name     VARCHAR,
  input         JSONB,
  output        JSONB,
  status        VARCHAR,
  error_code    VARCHAR,
  error_message TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_agent_step_run_seq ON agent.agent_steps (agent_run_id, sequence_no);
