-- Invite system for SUPER_ADMIN and PROGRAM_ADMIN onboarding
CREATE TYPE identity.invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

CREATE TABLE identity.invites (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                VARCHAR(255) UNIQUE NOT NULL,
  email                VARCHAR(255) NOT NULL CHECK (email = lower(email)),
  first_name           VARCHAR(255),
  last_name            VARCHAR(255),
  name                 VARCHAR(255) NOT NULL,
  role                 identity.user_role NOT NULL,
  institution_id       UUID REFERENCES org.institutions(id),
  program_id           UUID REFERENCES org.programs(id),
  department           VARCHAR(255),
  permissions          JSONB NOT NULL DEFAULT '[]',
  status               identity.invite_status NOT NULL DEFAULT 'PENDING',
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_by_user_id  UUID REFERENCES identity.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at          TIMESTAMPTZ
);

CREATE INDEX idx_invites_token ON identity.invites (token);
CREATE INDEX idx_invites_institution ON identity.invites (institution_id, role, status);
