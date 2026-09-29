-- Bug-fix round (2026-09-29): distance-based fuel/travel pricing depends on
-- the customer's address having real coordinates, which a one-off address
-- (AddressPicker.jsx) only gets if the customer explicitly taps "Use my
-- current location" - otherwise latitude/longitude stay null and the quote
-- preview gets stuck. Decided to skip real distance calculation entirely
-- until GPS/maps integration exists (bookings.service.js's computeFuelCharge
-- now always returns this base fee flat, ignoring distance - the per-km
-- logic itself is left in place, just bypassed). Rs. 20 was a placeholder
-- for the distance formula; Rs. 100 is the interim flat number.
UPDATE platform_settings SET value = '100'::jsonb, updated_at = now() WHERE key = 'fuel_base_fee';
