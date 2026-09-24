-- Scheduled booking against worker-set availability (business plan §13).

-- A scheduled booking is still `type = 'manual'` (direct-to-a-specific-worker,
-- not the broadcast/instant flow) - scheduled_for/response_deadline_hours/
-- respond_by are the only new surface, all null for an urgent ("now")
-- booking. No new booking type, no new status - the lifecycle once accepted
-- is identical to any other manual booking.
ALTER TABLE bookings ADD COLUMN scheduled_for TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN response_deadline_hours SMALLINT CHECK (response_deadline_hours IN (1, 6, 24));
-- Computed once at creation (created_at + response_deadline_hours) and
-- stored, rather than recomputed on every read - a single indexed sweep
-- (`WHERE status = 'requested' AND respond_by < now()`) is what actually
-- expires an unanswered request; see bookings.model.js
-- expireOverdueScheduledRequests.
ALTER TABLE bookings ADD COLUMN respond_by TIMESTAMPTZ;
CREATE INDEX idx_bookings_respond_by ON bookings(respond_by) WHERE status = 'requested' AND respond_by IS NOT NULL;

-- Self-reported only (not computed/derived) - shown on the worker's public
-- profile as "usually replies within Xh". Nullable/optional.
ALTER TABLE worker_profiles ADD COLUMN typical_response_hours SMALLINT;

-- When the worker last manually toggled online/offline via the explicit
-- toggle (as opposed to the schedule auto-setting it) - a manual override
-- takes precedence over the worker's availability schedule until the next
-- block boundary after this timestamp. See apps/api/src/lib/availability.js.
ALTER TABLE worker_profiles ADD COLUMN online_overridden_at TIMESTAMPTZ;

-- Weekly recurring availability blocks a worker sets from their dashboard.
-- day_of_week follows JS Date#getDay() (0 = Sunday .. 6 = Saturday) so it
-- maps directly without translation on the read side.
CREATE TABLE worker_availability_blocks (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);
CREATE INDEX idx_worker_availability_worker ON worker_availability_blocks(worker_id);
