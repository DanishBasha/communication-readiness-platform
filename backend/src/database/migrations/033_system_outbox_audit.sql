-- system.outbox_events  (DBML §21)
CREATE TABLE system.outbox_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR,
  aggregate_id   UUID,
  event_type     VARCHAR,
  dedupe_key     VARCHAR     NOT NULL,
  payload        JSONB,
  status         VARCHAR     NOT NULL DEFAULT 'PENDING',
  attempts       INTEGER     NOT NULL DEFAULT 0,
  available_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at   TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_outbox_dedupe_key     ON system.outbox_events (dedupe_key);
CREATE INDEX idx_outbox_status_available     ON system.outbox_events (status, available_at);


-- Rebuild system.audit_logs to match DBML §21
-- (actor_user_id nullable, scope_type, before_data, after_data, correlation_id;
--  drop user_id NOT NULL, metadata, ip_address)
-- Existing table is dropped and recreated because it only held dev data.
DROP TABLE IF EXISTS system.audit_logs;

CREATE TABLE system.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID        REFERENCES identity.users(id),
  action          VARCHAR,
  resource_type   VARCHAR,
  resource_id     UUID,
  scope_type      VARCHAR,
  before_data     JSONB,
  after_data      JSONB,
  correlation_id  VARCHAR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor_created       ON system.audit_logs (actor_user_id, created_at);
CREATE INDEX idx_audit_resource            ON system.audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_created             ON system.audit_logs (created_at);
