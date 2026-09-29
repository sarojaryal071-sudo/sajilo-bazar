-- Phase 3a: locks the final price at completion (removes the freely-
-- editable "final price" field) - a worker can still lower the price via a
-- discount, but unlike a price increase (which reuses the quotes flow and
-- needs the customer's explicit accept) a discount takes effect
-- immediately, no round trip. In exchange it requires a reason and is
-- durably logged here for later admin visibility - no admin screen reads
-- this yet (not built this phase, see the founder's instruction that a
-- simple log entry is enough), but the data is captured and queryable.
CREATE TABLE booking_discounts (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_price NUMERIC NOT NULL,
  discounted_price NUMERIC NOT NULL CHECK (discounted_price >= 0 AND discounted_price < original_price),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_discounts_booking ON booking_discounts(booking_id);
