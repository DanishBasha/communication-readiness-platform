-- Corrective migration: align M1 tables with COMPLETE_SCHEMA.dbml.
-- Adds missing columns/indexes; renames columns that differ; drops extra columns.
-- Safe to run on fresh DB (all objects already match after 001-033).
-- Safe to run on existing DB where 001-015 were applied.

---------------------------------------------------------------------------
-- org.institutions
---------------------------------------------------------------------------
ALTER TABLE org.institutions
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE org.institutions
  DROP COLUMN IF EXISTS type;

---------------------------------------------------------------------------
-- org.programs
---------------------------------------------------------------------------
ALTER TABLE org.programs
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Second unique index required by DBML
CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_id_institution
  ON org.programs (id, institution_id);

---------------------------------------------------------------------------
-- org.batches — remove track enum/column; add is_active, updated_at, indexes
---------------------------------------------------------------------------
ALTER TABLE org.batches
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE org.batches DROP COLUMN IF EXISTS track;

CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_program_id   ON org.batches (program_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_program_year ON org.batches (program_id, year);

---------------------------------------------------------------------------
-- org.subdivisions — change FK from batch_id → program_id; add code, is_active, updated_at
---------------------------------------------------------------------------
ALTER TABLE org.subdivisions
  ADD COLUMN IF NOT EXISTS program_id UUID,
  ADD COLUMN IF NOT EXISTS code       VARCHAR,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Back-fill program_id via batch for existing rows
UPDATE org.subdivisions s
SET program_id = b.program_id
FROM org.batches b
WHERE b.id = s.batch_id AND s.program_id IS NULL;

-- Make program_id NOT NULL after back-fill
ALTER TABLE org.subdivisions
  ALTER COLUMN program_id SET NOT NULL;

-- Add FK to programs
ALTER TABLE org.subdivisions
  ADD CONSTRAINT fk_subdivisions_program
  FOREIGN KEY (program_id) REFERENCES org.programs(id) ON DELETE RESTRICT;

-- Drop old batch_id FK and column
ALTER TABLE org.subdivisions DROP CONSTRAINT IF EXISTS subdivisions_batch_id_fkey;
ALTER TABLE org.subdivisions DROP COLUMN IF EXISTS batch_id;
ALTER TABLE org.subdivisions DROP COLUMN IF EXISTS type;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subdivisions_program_id   ON org.subdivisions (program_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subdivisions_program_code ON org.subdivisions (program_id, code);

---------------------------------------------------------------------------
-- org.students — add program_id + target_subdivision_id; drop M1-only columns
---------------------------------------------------------------------------
ALTER TABLE org.students
  ADD COLUMN IF NOT EXISTS program_id              UUID,
  ADD COLUMN IF NOT EXISTS target_subdivision_id   UUID REFERENCES org.subdivisions(id);

-- Back-fill program_id via batch
UPDATE org.students s
SET program_id = b.program_id
FROM org.batches b
WHERE b.id = s.batch_id AND s.program_id IS NULL;

ALTER TABLE org.students
  ALTER COLUMN program_id SET NOT NULL;

ALTER TABLE org.students
  ADD CONSTRAINT fk_students_program
  FOREIGN KEY (program_id) REFERENCES org.programs(id);

ALTER TABLE org.students DROP COLUMN IF EXISTS roll_number;
ALTER TABLE org.students DROP COLUMN IF EXISTS coding_handles;
ALTER TABLE org.students DROP COLUMN IF EXISTS resume_url;
ALTER TABLE org.students DROP COLUMN IF EXISTS resume_verified;

CREATE INDEX IF NOT EXISTS idx_students_program_batch ON org.students (program_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_students_program_sub   ON org.students (program_id, subdivision_id);

---------------------------------------------------------------------------
-- org.student_mentor_assignments — rename mentor_id → mentor_user_id; add starts_at / ends_at
---------------------------------------------------------------------------
ALTER TABLE org.student_mentor_assignments
  RENAME COLUMN mentor_id TO mentor_user_id;

ALTER TABLE org.student_mentor_assignments
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMPTZ;

-- Populate starts_at from assigned_at for existing rows
UPDATE org.student_mentor_assignments
SET starts_at = assigned_at
WHERE starts_at IS NULL AND assigned_at IS NOT NULL;

ALTER TABLE org.student_mentor_assignments
  DROP COLUMN IF EXISTS assigned_at;

---------------------------------------------------------------------------
-- org.trainer_subdivision_assignments
-- rename trainer_id → trainer_user_id; date → timestamptz; add is_active
---------------------------------------------------------------------------
ALTER TABLE org.trainer_subdivision_assignments
  RENAME COLUMN trainer_id TO trainer_user_id;

ALTER TABLE org.trainer_subdivision_assignments
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE org.trainer_subdivision_assignments
SET starts_at = start_date::TIMESTAMPTZ,
    ends_at   = end_date::TIMESTAMPTZ
WHERE starts_at IS NULL;

ALTER TABLE org.trainer_subdivision_assignments
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date;

CREATE INDEX IF NOT EXISTS idx_trainer_assign_trainer_sub
  ON org.trainer_subdivision_assignments (trainer_user_id, subdivision_id);

---------------------------------------------------------------------------
-- identity.users — add DBML columns; keep role/token_version/status for now
-- (full RBAC migration is a separate step — see 026_identity_rbac.sql)
---------------------------------------------------------------------------
ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES org.institutions(id),
  ADD COLUMN IF NOT EXISTS department_id  UUID,
  ADD COLUMN IF NOT EXISTS first_name     VARCHAR,
  ADD COLUMN IF NOT EXISTS last_name      VARCHAR,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT true;

-- Back-fill first_name from existing name column
UPDATE identity.users
SET first_name = split_part(name, ' ', 1),
    last_name  = NULLIF(substring(name FROM position(' ' IN name) + 1), '')
WHERE first_name IS NULL AND name IS NOT NULL;

---------------------------------------------------------------------------
-- Drop org.faculty_profiles (not in DBML)
---------------------------------------------------------------------------
DROP TABLE IF EXISTS org.faculty_profiles;
