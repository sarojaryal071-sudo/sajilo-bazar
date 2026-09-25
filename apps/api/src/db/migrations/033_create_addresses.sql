-- Customer saved addresses (business plan §13 home-location feature).
-- Reuses the same address_label/latitude/longitude shape bookings already
-- use, so a saved address slots straight into a booking request without
-- any translation. At most one default per user, enforced at the DB level
-- rather than trusted to application code - setting a new default first
-- clears the old one in the same transaction (see addresses.model.js).

CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(40) NOT NULL DEFAULT 'Home',
  address_label VARCHAR(200) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX addresses_user_id_idx ON addresses(user_id);

CREATE UNIQUE INDEX addresses_one_default_per_user
  ON addresses(user_id) WHERE is_default;
