-- Catalog of service types a worker can offer (e.g. "Pipe leak repair" under
-- "plumbing"). Seeded/managed by admin in Phase 6 - just the table for now.

CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  category VARCHAR(60) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_category ON services(category);
