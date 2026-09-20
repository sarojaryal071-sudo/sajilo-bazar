-- A worker's offered services and their stated price for each.
-- worker_profiles has no separate surrogate id (its PK is users.id), so this
-- references worker_profiles(user_id) directly.

CREATE TABLE worker_services (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, service_id)
);

CREATE INDEX idx_worker_services_worker ON worker_services(worker_id);
CREATE INDEX idx_worker_services_service ON worker_services(service_id) WHERE is_active = true;
