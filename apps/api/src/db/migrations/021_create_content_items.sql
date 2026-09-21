-- Admin panel Round D: Announcements + Policies. One shared table for both
-- content types (per the plan's "build one shared component, apply to
-- both") - announcement-only and policy-only columns are simply null for
-- the other kind. No cron/scheduler exists in this codebase, so
-- scheduled_at/expires_at are informational fields the admin UI computes a
-- "live now" state from, not something that runs a background publish job.
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('announcement', 'policy')),
  policy_type VARCHAR(30) CHECK (policy_type IN ('terms_of_service', 'privacy_policy', 'community_guidelines')),
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience VARCHAR(20) CHECK (audience IN ('all', 'customers', 'workers')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_items_kind ON content_items(kind);
-- A policy doc is a fixed, singular thing (there's exactly one current
-- Terms of Service) - this keeps the admin editing one row per type rather
-- than accumulating duplicates.
CREATE UNIQUE INDEX idx_content_items_policy_type ON content_items(policy_type) WHERE kind = 'policy';

-- The three policy docs always exist as editable drafts - Policies is an
-- edit-in-place screen, not a create-new-document screen.
INSERT INTO content_items (kind, policy_type, title, body, status) VALUES
  ('policy', 'terms_of_service', 'Terms of Service', '', 'draft'),
  ('policy', 'privacy_policy', 'Privacy Policy', '', 'draft'),
  ('policy', 'community_guidelines', 'Community Guidelines', '', 'draft');
