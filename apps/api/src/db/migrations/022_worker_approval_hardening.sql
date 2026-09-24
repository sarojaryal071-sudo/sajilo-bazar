-- Worker approval flow hardening:
-- - handle: auto-generated short identifier ("PL042"), assigned once a
--   worker is first approved (see admin.service.js decideDocument).
-- - welcomed_at: null until the one-time post-approval welcome moment has
--   been shown - a flag/timestamp check, not a repeating notification.
-- - review_comment: the admin's actual reason for rejecting a document, so
--   the worker sees why rather than just "rejected".
ALTER TABLE worker_profiles ADD COLUMN handle VARCHAR(10) UNIQUE;
ALTER TABLE worker_profiles ADD COLUMN welcomed_at TIMESTAMPTZ;
ALTER TABLE verification_documents ADD COLUMN review_comment TEXT;
