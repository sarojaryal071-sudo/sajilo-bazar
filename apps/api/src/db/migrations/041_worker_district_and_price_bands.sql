-- District-based booking matching (worker signup rework round). Mirrors the
-- pattern services.category already uses for extensibility: a DB-seeded
-- lookup table of free-text values, not a hardcoded enum, so support can
-- expand to a new district later with an INSERT, not a migration.
CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

INSERT INTO districts (name) VALUES ('Chitwan');

-- worker_profiles.district / addresses.district are plain text (not FK'd
-- to districts.id), same as services.category - matching is a simple
-- string compare, no join required. Both backfill every EXISTING row to
-- 'Chitwan' (all current seed data is Chitwan-based) so no pre-existing
-- row silently vanishes from district-filtered matching the moment that
-- filter goes live (see docs/PROJECT_INDEX.md migration 035/040 incident
-- notes on backfilling before closing a column off).
--
-- Only addresses.district goes on to SET NOT NULL: a customer chooses it
-- on the address create/edit form itself, so every new address row always
-- has one at insert time. worker_profiles.district stays nullable even
-- for new rows - a worker's profile row is created at signup (see
-- auth.model.js createUser), before the new onboarding flow's Step 2a
-- (district picker) ever runs, so an in-progress worker legitimately has
-- no district yet. The application layer treats a NULL district here as
-- "onboarding not yet at Step 2a", not as a data-integrity gap.
ALTER TABLE worker_profiles ADD COLUMN district VARCHAR(60);
UPDATE worker_profiles SET district = 'Chitwan' WHERE district IS NULL;

ALTER TABLE addresses ADD COLUMN district VARCHAR(60);
UPDATE addresses SET district = 'Chitwan' WHERE district IS NULL;
ALTER TABLE addresses ALTER COLUMN district SET NOT NULL;

-- A booking's district is snapshotted here rather than always resolved via
-- a live join to addresses, because AddressPicker also allows a "one-off"
-- freeform address (text + optional coords) that is never persisted to
-- addresses - such a booking has no addresses row to join against. Nullable:
-- an unknown district means matching falls back to distance-only for that
-- booking rather than matching zero workers.
ALTER TABLE bookings ADD COLUMN district VARCHAR(60);

-- Per-service admin-editable price band, same platform_settings key/value
-- pattern as fuel pricing (migration 037): one JSONB map keyed by
-- serviceId rather than one platform_settings row per service, so adding a
-- new service later never requires a migration here. Seeded with a
-- placeholder band per existing service - exact numbers don't matter yet,
-- same as fuel pricing's placeholder values; the founder tunes later via
-- the same admin-editable mechanism (see platformSettings.service.js
-- EDITABLE_KEYS).
INSERT INTO platform_settings (key, value)
SELECT 'service_price_bands', COALESCE(
  jsonb_object_agg(id::text, jsonb_build_object('min', 300, 'max', 2000)),
  '{}'::jsonb
)
FROM services;
