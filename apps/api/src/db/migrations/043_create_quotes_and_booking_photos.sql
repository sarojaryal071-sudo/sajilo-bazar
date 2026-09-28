-- Phase 1 data foundation for the counter-quote (Phase 2) and Get Quotes
-- (Phase 3) flows, plus the admin Booking Detail view (Phase 4) that will
-- surface both. One quotes table serves both flows - a manual counter-quote
-- is just the case where the booking already has a worker_id (so only that
-- worker can submit, naturally producing a single row), while Get Quotes is
-- an open booking (worker_id still null) that multiple workers can quote on.
-- No mode flag on the row itself; which flow a booking is in is read off
-- bookings.worker_id by the service layer, same way it already reads
-- worker_id for a dozen other decisions in bookings.service.js.
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  message TEXT,
  -- A worker's own reference photo on the quote itself (e.g. a similar past
  -- job) - distinct from booking_photos below, which is the customer's
  -- problem photo and the worker's before/after job photos. Same proxy-only
  -- rule as verification_documents.file_url: never returned to a client as
  -- a raw Cloudinary URL (see QuoteSchema in packages/shared).
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_booking ON quotes(booking_id);
CREATE INDEX idx_quotes_worker ON quotes(worker_id);

-- One row per photo attached to a booking - the customer's problem photo at
-- request time, and the worker's before/after photos once the job is under
-- way. Same proxy pattern as verification_documents/quotes.photo_url: url
-- is the underlying Cloudinary location, never handed to a client directly
-- (see BookingPhotoSchema).
CREATE TABLE booking_photos (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(10) NOT NULL CHECK (uploaded_by IN ('customer', 'worker')),
  photo_type VARCHAR(10) NOT NULL CHECK (photo_type IN ('problem', 'before', 'after')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_photos_booking ON booking_photos(booking_id);

-- Get Quotes (Phase 3) config, added now alongside this schema per the
-- founder's request - values are unused until Phase 3 wires up the actual
-- open-quote-window flow, same admin-editable platform_settings pattern as
-- fuel pricing and service_price_bands (see platformSettings.service.js
-- EDITABLE_KEYS, updated alongside this migration).
INSERT INTO platform_settings (key, value) VALUES
  ('get_quotes_window_minutes', '5'::jsonb),
  ('get_quotes_cap', '5'::jsonb);
