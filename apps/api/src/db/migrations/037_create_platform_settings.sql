-- Generic admin-editable key/value config (Piece D of the "Desktop scope,
-- Admin RBAC + escalation, Customer responsive reflow, Fuel charge" round,
-- 2026-09-27). JSONB value so a future setting can be any shape, not just
-- a number - a plain admin-editable numeric flag like this one currently
-- doesn't exist anywhere in this codebase (COMMISSION_RATE and the trust-
-- score thresholds are hardcoded JS constants, not DB-backed). Seeded here
-- with the two fuel/travel-charge values this round needs; the API only
-- lets an admin edit the keys it already knows about (see
-- platformSettings.service.js EDITABLE_KEYS), so this table growing a new
-- key later is a migration + a service-layer allowlist addition, not a
-- schema change to any other table.
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INTEGER REFERENCES users(id)
);

INSERT INTO platform_settings (key, value) VALUES
  ('fuel_base_fee', '20'::jsonb),
  ('fuel_rate_per_km', '5'::jsonb);

-- Distinct from bookings.price (service charge only, what
-- commission_ledger's 15% is calculated against). The worker keeps 100% of
-- this - a pass-through, never folded into price. Default 0 so every
-- pre-existing booking reads as "no fuel charge" rather than null.
ALTER TABLE bookings ADD COLUMN fuel_charge NUMERIC NOT NULL DEFAULT 0;
