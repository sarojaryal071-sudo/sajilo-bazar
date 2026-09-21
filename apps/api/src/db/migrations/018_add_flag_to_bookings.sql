-- Lightweight moderation marker for the admin Bookings detail screen (Phase
-- 6, Round A) - a boolean flag with an optional reason, not a full dispute
-- record. Disputes get their own table in Round C once there's an actual
-- resolution workflow to attach to a flagged booking.

ALTER TABLE bookings
  ADD COLUMN flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN flag_reason VARCHAR(300);

CREATE INDEX idx_bookings_flagged ON bookings(flagged) WHERE flagged = true;
