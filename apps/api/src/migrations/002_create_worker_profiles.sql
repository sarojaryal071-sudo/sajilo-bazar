-- Worker-specific fields, split off users so the users table stays small
-- and this only exists for role = 'worker'.

CREATE TABLE worker_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio VARCHAR(500),
  is_online BOOLEAN NOT NULL DEFAULT false,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'unsubmitted'
    CHECK (verification_status IN ('unsubmitted', 'pending', 'approved', 'rejected')),
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  jobs_completed_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_area_label VARCHAR(120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Powers the instant-request broadcast: "who is online, near this point,
-- offering this service" needs to be a fast query.
CREATE INDEX idx_worker_profiles_online ON worker_profiles(is_online) WHERE is_online = true;
