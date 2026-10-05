-- performance.skills  (DBML §5)
CREATE TABLE performance.skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR     NOT NULL,
  category    VARCHAR     NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_skills_category_name ON performance.skills (category, name);


-- performance.student_skills  (DBML §5)
-- Composite PK; no surrogate id.
CREATE TABLE performance.student_skills (
  student_id        UUID    NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  skill_id          UUID    NOT NULL REFERENCES performance.skills(id) ON DELETE CASCADE,
  proficiency_score NUMERIC,
  source            VARCHAR,
  updated_at        TIMESTAMPTZ,
  PRIMARY KEY (student_id, skill_id)
);
