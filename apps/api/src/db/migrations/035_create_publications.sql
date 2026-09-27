-- Founder decision 2026-09-25: unify admin "Announcement" and "Promo
-- banner" under one publishing flow with a Type selector, replacing the
-- content_items kind='announcement' half of that table (which conflated
-- personal notifications with Home/Dashboard marketing content - the same
-- publish action fanned out a real notification for what was really just
-- a promo banner update). content_items itself stays, but going forward is
-- restricted to kind='policy' only.
--
-- type drives all routing (see publications.service.js): 'notification'
-- fans out via the existing notify()/notifications table and is visible
-- only through the bell badge + Alerts feed; 'promotion' never touches
-- notifications at all and renders only as the Home/Dashboard carousel.
-- Deliberately a plain VARCHAR + CHECK, not an enum type, so a future
-- publication type is a migration adding one CHECK value plus a routing
-- branch - no new admin screen.
CREATE TABLE publications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('notification', 'promotion')),
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  cta_label VARCHAR(60),
  cta_link TEXT,
  audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'customers', 'workers')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publications_type ON publications(type);

-- content_items no longer accepts 'announcement' rows - the admin
-- Publications screen (publications table above) replaces that half of
-- the old Announcements screen. This migration originally assumed the
-- founder would clear any stale announcement-kind row by hand before it
-- ran ("no migration needs to touch it") - that didn't happen everywhere,
-- and the CHECK below then fails against real pre-existing rows wherever
-- it wasn't (2026-09-27 prod incident: Render deploys failing on this
-- exact constraint for ~2 days). Fixed here by clearing any non-'policy'
-- row before tightening the CHECK, rather than relying on manual cleanup.
-- Those rows are fully superseded by the publications table above
-- (seedPromotion/seedNotificationPublication cover this going forward),
-- so DELETE is fine - no backfill needed. Safe to run whether or not any
-- such rows still exist (0-row DELETE is a no-op); the whole file already
-- runs inside one transaction (see migrate.js), so this and the CHECK
-- below either both land or neither does.
DELETE FROM content_items WHERE kind NOT IN ('policy');
ALTER TABLE content_items DROP CONSTRAINT content_items_kind_check;
ALTER TABLE content_items ADD CONSTRAINT content_items_kind_check CHECK (kind = 'policy');
