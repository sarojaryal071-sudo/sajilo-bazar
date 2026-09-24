-- Trust score system + phone-number visibility scoping (business-plan spec,
-- not open for reinterpretation on the numeric weights/thresholds).

-- No "Newly Joined" grace-period/featured-placement mechanism existed
-- anywhere in the codebase prior to this migration (searched thoroughly -
-- welcomed_at is an unrelated one-time welcome-banner flag). approved_at
-- is new: the timestamp of a worker's most recent approval, which is what
-- the trust-score grace period is measured from. Set going forward by
-- admin.model.js setWorkerVerificationStatus whenever status flips to
-- 'approved' - backfilled here from updated_at as the closest available
-- signal for workers already approved before this column existed.
ALTER TABLE worker_profiles ADD COLUMN approved_at TIMESTAMPTZ;
UPDATE worker_profiles SET approved_at = updated_at WHERE verification_status = 'approved';

-- The stored raw 0-100 score (see trustScore module) - null while a worker
-- is within the grace period or otherwise not yet scoreable. Persisted (not
-- computed purely on read) so a later task can ORDER BY it for search/Home
-- ranking without recomputing per request.
ALTER TABLE worker_profiles ADD COLUMN trust_score NUMERIC;

-- Who initiated a cancellation - only worker-initiated cancellations feed
-- the rolling-30-job cancellation rate (business plan). Null for
-- historical rows predating this column and for admin overrides
-- (adminCancelBooking), which aren't either party's own action.
ALTER TABLE bookings ADD COLUMN initiated_by VARCHAR(10) CHECK (initiated_by IN ('worker', 'customer'));

-- Which party an admin found at fault when resolving a dispute - only
-- 'worker' counts toward the rolling-30-day dispute escalation and the
-- trust-score dispute deduction. Null until resolved; a dismissed dispute
-- has no fault finding.
ALTER TABLE disputes ADD COLUMN at_fault VARCHAR(10) CHECK (at_fault IN ('worker', 'customer', 'none'));
