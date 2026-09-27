-- Typing indicator + delivered/seen ticks for booking chat (2026-09-27) -
-- additive, nullable columns only. IF NOT EXISTS makes this safe to re-run
-- against a table that already has existing rows (per the standing
-- idempotency rule - see the 035 prod incident this same session fixed);
-- schema_migrations already guarantees a given environment only ever runs
-- this file once, so the guard is an extra safety net, not load-bearing.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
