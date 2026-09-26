-- session.question_bank_items  (DBML §9)
-- pgvector embedding column included.
CREATE TABLE session.question_bank_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text     TEXT,
  difficulty        VARCHAR,
  evaluation_criteria JSONB,
  metadata          JSONB,
  embedding_model   VARCHAR,
  embedding_version INTEGER,
  content_hash      VARCHAR,
  embedded_at       TIMESTAMPTZ,
  is_generated      BOOLEAN     NOT NULL DEFAULT false,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Add embedding column only when pgvector is installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    ALTER TABLE session.question_bank_items ADD COLUMN IF NOT EXISTS embedding vector;
  END IF;
END;
$$;


-- session.question_bank_item_skills  (DBML §9)
-- A question can map to multiple skills.
CREATE TABLE session.question_bank_item_skills (
  question_bank_item_id UUID    NOT NULL REFERENCES session.question_bank_items(id) ON DELETE CASCADE,
  skill_id              UUID    NOT NULL REFERENCES performance.skills(id) ON DELETE CASCADE,
  is_primary            BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (question_bank_item_id, skill_id)
);


-- session.questions  (DBML §10)
-- Questions used inside a specific attempt.
CREATE TABLE session.questions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID        NOT NULL REFERENCES assessment.assessment_attempts(id) ON DELETE CASCADE,
  question_bank_item_id UUID        REFERENCES session.question_bank_items(id),
  listening_story_id    UUID        REFERENCES knowledge.listening_stories(id),
  question_type         VARCHAR,
  sequence_no           INTEGER,
  question_text         TEXT,
  difficulty            VARCHAR,
  primary_skill_id      UUID        REFERENCES performance.skills(id),
  evaluation_criteria   JSONB,
  question_version      INTEGER,
  is_generated          BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_questions_attempt_seq ON session.questions (attempt_id, sequence_no);
CREATE UNIQUE INDEX uq_questions_attempt_id  ON session.questions (attempt_id, id);
