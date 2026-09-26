-- Admin RBAC (2026-09-27, Round E - Staff): department-based access control
-- for admin/staff accounts, plus manual escalation on disputes/support
-- tickets. Departments are a many-to-many grant (a staff account can hold
-- more than one), modeled as a join table rather than an array column,
-- matching this codebase's existing convention of a plain join table for
-- many-to-many relationships (e.g. booking_services) over an array column.
--
-- Super Admin is a separate flag, not one of the four assignable
-- departments (Analytics and Settings are Super-Admin-only, never
-- department-gated) - a boolean column on users rather than a sentinel
-- department value, so "is this department-gated at all" and "does this
-- bypass department gating entirely" stay two independent questions.
--
-- Every existing admin becomes a Super Admin here so nobody is locked out
-- by this migration landing with zero department grants - the founder
-- assigns real department scopes to any newly-created staff accounts
-- afterward from the new Staff screen.
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET is_super_admin = true WHERE role = 'admin';

CREATE TABLE admin_department_grants (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department VARCHAR(30) NOT NULL CHECK (department IN ('support', 'finance', 'operations', 'people_content')),
  PRIMARY KEY (user_id, department)
);

-- Disputes/support tickets are now department-scoped, defaulting to
-- 'support' (first point of contact per the decision doc) - escalating one
-- just updates this column to move it into a different department's queue,
-- no ownership/ticket-splitting model needed.
ALTER TABLE disputes ADD COLUMN department VARCHAR(30) NOT NULL DEFAULT 'support'
  CHECK (department IN ('support', 'finance', 'operations', 'people_content'));
ALTER TABLE support_tickets ADD COLUMN department VARCHAR(30) NOT NULL DEFAULT 'support'
  CHECK (department IN ('support', 'finance', 'operations', 'people_content'));

-- One shared escalation log for both entity types rather than two near-
-- identical tables - entity_type + entity_id is the only polymorphic bit,
-- everything else (from/to department, who, when) is identical shape.
CREATE TABLE department_escalations (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('dispute', 'support_ticket')),
  entity_id INTEGER NOT NULL,
  from_department VARCHAR(30) NOT NULL,
  to_department VARCHAR(30) NOT NULL,
  escalated_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_department_escalations_entity ON department_escalations(entity_type, entity_id);
