-- The platform's accounting at MVP scale (see DATA_MODEL.md #11) - a
-- running balance, not double-entry bookkeeping. One row per completed
-- booking, credit_balance_after is the worker's running balance as of that
-- entry (negative = owed to the platform - see commission.js for why).

CREATE TABLE commission_ledger (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  job_price NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  credit_balance_after NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX idx_commission_ledger_worker ON commission_ledger(worker_id, created_at DESC);
