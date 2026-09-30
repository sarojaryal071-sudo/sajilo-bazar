-- Catalog & Pricing merge (target-spec Phase 4) - commission_rate was a
-- hardcoded JS constant (commissionLedger.service.js's COMMISSION_RATE,
-- 0.15) with no admin-editable counterpart anywhere. This seeds it as a
-- real platform_settings row at the same value, so migrating the code to
-- read it from here (see commissionLedger.service.js) changes nothing
-- about what a booking completing today actually charges - only where
-- the number lives, and that an admin can now change it.
INSERT INTO platform_settings (key, value) VALUES ('commission_rate', '0.15'::jsonb);
