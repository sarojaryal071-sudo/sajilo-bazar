-- Audit Log (target-spec Phase 2, Staff & Access) - a durable record of
-- sensitive admin/staff actions, not a monitoring/alerting system. actor_id
-- is nullable only for a failed login against a phone that never resolved
-- to an account (no user row to point at yet). target_type/target_id are
-- a loose pointer, not a foreign key - the target can be a row in any of
-- several tables (users, services, disputes, platform_settings, ...), so a
-- real FK isn't possible without a polymorphic constraint this table
-- doesn't need. old_value/new_value are JSONB so each action logs whatever
-- fields it actually changed, not a fixed column shape.

CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(60) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  target_type VARCHAR(30),
  target_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Powers the Audit Log screen's default (most-recent-first) listing and its
-- date-range filter.
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
-- Powers the "by actor" filter.
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor_id);
