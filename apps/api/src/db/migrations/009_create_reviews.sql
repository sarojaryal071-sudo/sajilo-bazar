-- One review per booking, left by the customer after completion.
-- UNIQUE booking_id both enforces "one review per booking" and lets the
-- reviews module use it as an upsert-safe natural key.

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
