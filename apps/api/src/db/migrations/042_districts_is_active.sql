-- Lets an admin add a future district to the districts table without it
-- being immediately live for worker onboarding / address selection - the
-- row can exist (e.g. seeded ahead of a launch) while staying hidden from
-- GET /districts until flipped on. No admin UI for toggling this is built
-- yet (not asked for) - this only makes the data model support it.
ALTER TABLE districts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
