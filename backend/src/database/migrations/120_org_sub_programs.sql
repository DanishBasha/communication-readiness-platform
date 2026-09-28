-- Dynamic sub-programs under org.programs.
-- Represents training specializations (e.g. Full Stack, Cyber, AI under PEP).
-- code is auto-derived from name during import; unique within a program.
-- Deactivation sets is_active=false; existing student associations are preserved.

CREATE TABLE org.sub_programs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID    NOT NULL REFERENCES org.programs(id) ON DELETE RESTRICT,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, code)
);

CREATE INDEX idx_sub_programs_program_id ON org.sub_programs (program_id);
