-- Student ↔ training-program association.
-- This is the canonical record of which training specialization a student belongs to.
-- sub_program_id is nullable — students enrolled in a program with no sub-program leave it NULL.
-- UNIQUE (student_id, program_id) enforces: one active program enrollment per program per student.

CREATE TABLE org.student_programs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  program_id     UUID NOT NULL REFERENCES org.programs(id) ON DELETE RESTRICT,
  sub_program_id UUID REFERENCES org.sub_programs(id) ON DELETE RESTRICT,
  enrolled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, program_id)
);

CREATE INDEX idx_student_programs_program_id     ON org.student_programs (program_id);
CREATE INDEX idx_student_programs_sub_program_id ON org.student_programs (sub_program_id);
