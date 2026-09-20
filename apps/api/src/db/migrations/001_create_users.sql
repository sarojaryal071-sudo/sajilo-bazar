-- Users: customers, workers, and admin all live in one table, distinguished
-- by role. Keeps auth simple - one login flow for everyone.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(20) UNIQUE NOT NULL,      -- public id shown to other users, e.g. "U1042"
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(160) UNIQUE,
  password_hash TEXT NOT NULL,
  profile_image_url TEXT,
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
