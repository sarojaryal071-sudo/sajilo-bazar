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
-- the old Announcements screen. Existing announcement rows, if any, are
-- left as-is - the founder is separately removing the stale seeded one
-- by hand before this ships, per the 2026-09-25 decision doc ("no
-- migration needs to touch it"). Any environment that still has an
-- announcement-kind row when this runs needs that row cleared first.
ALTER TABLE content_items DROP CONSTRAINT content_items_kind_check;
ALTER TABLE content_items ADD CONSTRAINT content_items_kind_check CHECK (kind = 'policy');
