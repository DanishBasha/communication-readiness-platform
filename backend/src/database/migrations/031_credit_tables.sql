-- credit.credit_accounts  (DBML §18)
CREATE TABLE credit.credit_accounts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL UNIQUE REFERENCES org.students(id) ON DELETE CASCADE,
  balance    NUMERIC     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- credit.credit_transactions  (DBML §18)
-- Append-only ledger. idempotency_key prevents duplicate charges.
CREATE TABLE credit.credit_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL REFERENCES credit.credit_accounts(id),
  student_id       UUID        NOT NULL REFERENCES org.students(id) ON DELETE CASCADE,
  transaction_type VARCHAR,
  amount           NUMERIC,
  balance_after    NUMERIC,
  idempotency_key  VARCHAR     NOT NULL,
  reference_type   VARCHAR,
  reference_id     UUID,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_credit_tx_idempotency ON credit.credit_transactions (idempotency_key);
CREATE INDEX idx_credit_tx_student_created   ON credit.credit_transactions (student_id, created_at);


-- credit.credit_policies  (DBML §18)
CREATE TABLE credit.credit_policies (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type               VARCHAR,
  institution_id           UUID        REFERENCES org.institutions(id),
  program_id               UUID        REFERENCES org.programs(id),
  subdivision_id           UUID        REFERENCES org.subdivisions(id),
  student_id               UUID        REFERENCES org.students(id),
  initial_credit_amount    NUMERIC,
  consume_amount           NUMERIC,
  reward_ceiling           NUMERIC,
  max_balance              NUMERIC,
  self_practice_enabled    BOOLEAN     NOT NULL DEFAULT false,
  conducted_attempt_policy JSONB,
  is_active                BOOLEAN     NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_credit_accounts_updated_at
  BEFORE UPDATE ON credit.credit_accounts
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_credit_policies_updated_at
  BEFORE UPDATE ON credit.credit_policies
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();
