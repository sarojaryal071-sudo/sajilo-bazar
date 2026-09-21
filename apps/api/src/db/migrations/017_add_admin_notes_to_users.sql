-- Internal admin notes for the Users detail screen (Phase 6, Round A). One
-- free-text field per user, editable by any admin - no authorship/history
-- tracking, matching this project's "no roles_and_permissions until there's
-- a support team beyond the founder" stance (see DATA_MODEL.md).

ALTER TABLE users ADD COLUMN admin_notes TEXT;
