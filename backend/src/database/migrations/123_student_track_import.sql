-- Add IMPORT track value for auto-created batches used by the student import endpoint.
-- Students imported via POST /api/admin/students/import are placed in an IMPORT batch
-- so batch_id NOT NULL is satisfied without needing to know the real cohort year.
-- IF NOT EXISTS prevents duplicate-enum errors when migration is re-run after a rollback.

ALTER TYPE org.student_track ADD VALUE IF NOT EXISTS 'IMPORT';
