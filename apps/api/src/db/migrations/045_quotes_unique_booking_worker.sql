-- Phase 2 (manual counter-quote): "a worker may submit at most one quote
-- per booking, ever" needs to be race-safe, not just an application-level
-- check-then-insert (see quotes.service.js submitQuote) - two concurrent
-- submissions from the same worker on the same booking must not both land.
-- Scoped to (booking_id, worker_id), not booking_id alone, so this doesn't
-- constrain Get Quotes (Phase 3, not built yet), where several different
-- workers each still get their own single row on the same open booking.
ALTER TABLE quotes ADD CONSTRAINT quotes_booking_worker_key UNIQUE (booking_id, worker_id);
