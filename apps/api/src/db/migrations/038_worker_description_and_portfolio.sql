-- Richer worker profile (2026-09-27) - a free-text description alongside
-- the existing `bio`, and a portfolio of past-work items. Foundation for a
-- future multi-vertical expansion (digital services alongside household
-- trades), so `category` reuses `services.category`'s existing free-text
-- convention (that table has no separate category table/enum either - see
-- migration 024's own comment) rather than a new enum scoped to today's
-- household-only categories.
ALTER TABLE worker_profiles ADD COLUMN description TEXT;

-- No moderation/status field - items are self-serve and go live
-- immediately on save, same trust model as reviews. Admin's existing
-- suspend/moderation tools remain the safety net if something's reported;
-- this doesn't need its own review queue.
CREATE TABLE worker_portfolio_items (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]',
  link TEXT,
  category VARCHAR(60) NOT NULL,
  work_date DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_portfolio_items_worker ON worker_portfolio_items(worker_id, display_order);
