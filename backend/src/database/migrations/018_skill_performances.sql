-- performance.skill_performances  (DBML §15)
-- Per-attempt model (not aggregate). Multiple rows per student+skill allowed.
-- attempt_id FK to assessment.assessment_attempts added after that table exists.
CREATE TABLE performance.skill_performances (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  skill_id          UUID        NOT NULL REFERENCES performance.skills(id) ON DELETE CASCADE,
  attempt_id        UUID,                  -- nullable; FK added later
  score             NUMERIC,
  proficiency_level VARCHAR,
  source            VARCHAR,
  measured_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_perf_student_skill_measured ON performance.skill_performances (student_id, skill_id, measured_at);
CREATE INDEX idx_skill_perf_skill_measured          ON performance.skill_performances (skill_id, measured_at);
