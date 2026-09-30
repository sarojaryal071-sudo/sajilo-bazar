-- Finance (lean, target-spec Phase 8/9) - manual expense list. Deliberately
-- minimal: vendor and category are free text (no vendor/category lookup
-- tables - "no vendor management beyond a free-text field" per the spec),
-- no recurring-expense automation, no auto-classification. paid_at mirrors
-- this app's existing pattern for stamping the exact moment a status
-- transition happened (publications.published_at, disputes.resolved_at).
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  vendor VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
