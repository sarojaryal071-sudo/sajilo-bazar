-- Manual booking only for now (type = 'manual'); 'instant' and booking_offers
-- land in Phase 3. worker_id is nullable because an instant request has no
-- worker until an offer is accepted - not needed by manual bookings today,
-- but the column has to allow it now since Phase 3 extends this same table.

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'instant')),
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined')),
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price NUMERIC(10,2),
  address_label VARCHAR(200) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  cancelled_by INTEGER REFERENCES users(id),
  cancel_reason VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_worker ON bookings(worker_id);
CREATE INDEX idx_bookings_status ON bookings(status);
