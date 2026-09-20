-- A booking can now cover more than one service from the same worker (was
-- a single bookings.service_id) - this table replaces that column.
--
-- price is nullable: for a manual booking every row gets a real price at
-- creation time (snapshotted from worker_services, same server-trusted-price
-- principle as before). For an instant request, no worker is known yet at
-- creation, so rows are inserted with price = NULL and only priced once a
-- worker claims it.
--
-- bookings.price stays as-is (a denormalized sum of these rows' prices,
-- kept in sync on write) rather than being dropped in favor of always
-- computing it - every existing read of booking.price (lists, detail,
-- notifications, commission ledger) keeps working unchanged.

CREATE TABLE booking_services (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) CHECK (price IS NULL OR price > 0),
  UNIQUE (booking_id, service_id)
);

CREATE INDEX idx_booking_services_booking ON booking_services(booking_id);

-- Backfill: every existing booking's single service_id/price becomes its
-- one booking_services row (price carries over as-is, including NULL for
-- an instant request that was never priced).
INSERT INTO booking_services (booking_id, service_id, price)
SELECT id, service_id, price FROM bookings WHERE service_id IS NOT NULL;

ALTER TABLE bookings DROP COLUMN service_id;
