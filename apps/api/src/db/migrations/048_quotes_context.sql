-- Phase 3a: a price-increase request (worker discovers extra material/time
-- mid-job) reuses the same quotes table/submit-decide endpoints as the
-- Phase 2 pre-acceptance counter-quote, but is a genuinely separate use -
-- a worker may need one of each on the same booking (one counter-quote
-- during negotiation, one price-increase later, mid-job). The Phase 2
-- "at most one quote, ever" rule (migration 045) was scoped to the
-- counter-quote negotiation and didn't anticipate this second use, so it's
-- rescoped here to be per-context rather than a single global one-shot.
-- Existing rows all default to 'counter_offer', which is exactly what they
-- are - no backfill needed.
ALTER TABLE quotes ADD COLUMN context VARCHAR(20) NOT NULL DEFAULT 'counter_offer'
  CHECK (context IN ('counter_offer', 'price_increase'));

ALTER TABLE quotes DROP CONSTRAINT quotes_booking_worker_key;
ALTER TABLE quotes ADD CONSTRAINT quotes_booking_worker_context_key UNIQUE (booking_id, worker_id, context);
