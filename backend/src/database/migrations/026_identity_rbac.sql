-- identity.roles  (DBML §2)
CREATE TABLE identity.roles (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- identity.permissions  (DBML §2)
CREATE TABLE identity.permissions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL UNIQUE,
  description TEXT
);

-- identity.role_permissions  (DBML §2)
CREATE TABLE identity.role_permissions (
  role_id       UUID NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- identity.role_assignments  (DBML §2)
-- Scoped role assignment. scope_type indicates which scope columns are populated.
CREATE TABLE identity.role_assignments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  role_id        UUID        NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  scope_type     VARCHAR,
  institution_id UUID        REFERENCES org.institutions(id) ON DELETE CASCADE,
  program_id     UUID        REFERENCES org.programs(id) ON DELETE CASCADE,
  subdivision_id UUID        REFERENCES org.subdivisions(id) ON DELETE CASCADE,
  batch_id       UUID        REFERENCES org.batches(id) ON DELETE CASCADE,
  department_id  UUID,
  student_id     UUID        REFERENCES org.students(id) ON DELETE CASCADE,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_assignments_user    ON identity.role_assignments (user_id);
CREATE INDEX idx_role_assignments_role    ON identity.role_assignments (role_id);
CREATE INDEX idx_role_assignments_active  ON identity.role_assignments (user_id, is_active);

-- Seed the five platform roles
INSERT INTO identity.roles (name, description) VALUES
  ('STUDENT',               'Enrolled student'),
  ('FACULTY_MENTOR',        'Faculty mentor assigned to students'),
  ('PROGRAM_ADMIN',         'Program administrator'),
  ('TRAINER',               'Visiting domain trainer'),
  ('PLACEMENT_COORDINATOR', 'Placement coordinator with institution-wide access')
ON CONFLICT (name) DO NOTHING;
