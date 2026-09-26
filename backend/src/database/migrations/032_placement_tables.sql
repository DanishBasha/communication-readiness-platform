-- placement.checklist_items  (DBML §22)
CREATE TABLE placement.checklist_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     UUID        NOT NULL REFERENCES org.programs(id) ON DELETE CASCADE,
  subdivision_id UUID        REFERENCES org.subdivisions(id) ON DELETE SET NULL,
  name           VARCHAR,
  description    TEXT,
  category       VARCHAR,
  max_score      NUMERIC,
  weight         NUMERIC,
  is_required    BOOLEAN     NOT NULL DEFAULT false,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_checklist_program_name ON placement.checklist_items (program_id, name);
CREATE INDEX idx_checklist_program_sub         ON placement.checklist_items (program_id, subdivision_id);


-- placement.checklist_progress  (DBML §22)
CREATE TABLE placement.checklist_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  checklist_item_id UUID        NOT NULL REFERENCES placement.checklist_items(id) ON DELETE CASCADE,
  status            VARCHAR,
  score             NUMERIC,
  max_score         NUMERIC,
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_checklist_progress_student_item ON placement.checklist_progress (student_id, checklist_item_id);
CREATE INDEX idx_checklist_progress_student_status     ON placement.checklist_progress (student_id, status);


-- placement.mentor_verifications  (DBML §22)
CREATE TABLE placement.mentor_verifications (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  mentor_user_id        UUID        NOT NULL REFERENCES identity.users(id),
  verification_type     VARCHAR,
  checklist_progress_id UUID        REFERENCES placement.checklist_progress(id) ON DELETE SET NULL,
  status                VARCHAR,
  notes                 TEXT,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_verifications_student_type   ON placement.mentor_verifications (student_id, verification_type);
CREATE INDEX idx_mentor_verifications_mentor_student ON placement.mentor_verifications (mentor_user_id, student_id);
CREATE INDEX idx_mentor_verifications_checklist      ON placement.mentor_verifications (checklist_progress_id);


-- placement.placement_eligibility  (DBML §22)
CREATE TABLE placement.placement_eligibility (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL UNIQUE REFERENCES org.students(id) ON DELETE CASCADE,
  total_score     NUMERIC,
  maximum_score   NUMERIC,
  threshold_score NUMERIC,
  is_eligible     BOOLEAN,
  evaluated_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT
);

CREATE TRIGGER trg_checklist_items_updated_at
  BEFORE UPDATE ON placement.checklist_items
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_mentor_verifications_updated_at
  BEFORE UPDATE ON placement.mentor_verifications
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_placement_eligibility_updated_at
  BEFORE UPDATE ON placement.placement_eligibility
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();
