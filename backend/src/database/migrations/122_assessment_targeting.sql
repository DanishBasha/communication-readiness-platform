-- Optional program/sub-program targeting for assessments.
-- NULL means the assessment is open to all students (current behaviour, preserved).
-- Non-NULL restricts eligibility to students enrolled in that program/sub-program.

ALTER TABLE assessment.assessments
  ADD COLUMN target_program_id     UUID REFERENCES org.programs(id)     ON DELETE RESTRICT,
  ADD COLUMN target_sub_program_id UUID REFERENCES org.sub_programs(id) ON DELETE RESTRICT;
