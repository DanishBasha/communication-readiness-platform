-- org.departments  (DBML §1)
CREATE TABLE org.departments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES org.institutions(id) ON DELETE RESTRICT,
  name           VARCHAR,
  code           VARCHAR,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_departments_inst_code ON org.departments (institution_id, code);
CREATE INDEX idx_departments_institution    ON org.departments (institution_id);


-- org.resumes  (DBML §6)
-- Replaces resume_url / resume_verified columns on org.students.
CREATE TABLE org.resumes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  version     INTEGER,
  object_key  VARCHAR,
  file_name   VARCHAR,
  parsed_text TEXT,
  parsed_data JSONB,
  is_current  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_resumes_student_version ON org.resumes (student_id, version);
CREATE INDEX idx_resumes_student              ON org.resumes (student_id);

CREATE TRIGGER trg_resumes_updated_at
  BEFORE UPDATE ON org.resumes
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();
