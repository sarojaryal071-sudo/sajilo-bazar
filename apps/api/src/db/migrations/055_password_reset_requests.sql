-- Document-based password reset for locked-out workers (no OTP/SMS in this app).
-- must_change_password reuses the same "force a change on next login" idea as
-- the staff reset flow's audit action name, but no such column existed yet.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE password_reset_requests (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason VARCHAR(300)
);

CREATE INDEX idx_password_reset_requests_worker_id ON password_reset_requests(worker_id);
CREATE INDEX idx_password_reset_requests_status ON password_reset_requests(status);
