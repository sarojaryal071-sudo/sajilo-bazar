-- Tracks the instant-request broadcast fan-out: who was notified, who
-- accepted. One row per (booking, worker) pair notified.

CREATE TABLE booking_offers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (booking_id, worker_id)
);

CREATE INDEX idx_booking_offers_booking ON booking_offers(booking_id);
CREATE INDEX idx_booking_offers_worker ON booking_offers(worker_id) WHERE status = 'pending';
