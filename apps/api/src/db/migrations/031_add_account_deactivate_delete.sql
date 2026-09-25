-- Settings screen "Deactivate account" (reversible - logging back in clears
-- this) and "Delete account" (irreversible - the in-app data deletion
-- request promised in the Privacy Policy; PII is anonymized in place on
-- login/delete rather than the row being dropped, since bookings/disputes/
-- commission_ledger all carry an ON DELETE CASCADE/RESTRICT FK to users.id
-- and are meant to survive, anonymized, per the Policy's retention section).

ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
