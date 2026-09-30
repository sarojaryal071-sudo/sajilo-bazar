-- Platform Configuration (target-spec Phase 6) - two more hardcoded JS
-- constants migrated into platform_settings, same move as commission_rate
-- (migration 051). Both seeded at the exact value their constant held, so
-- this changes nothing about matching or pricing behavior on deploy.
--
-- matching_radius_km: bookings.service.js's DEFAULT_RADIUS_KM (15) - the
-- city-scale radius used to find nearby online workers for an instant
-- booking.
--
-- flat_fuel_charge: bookings.service.js's FLAT_FUEL_CHARGE (true) - this
-- table's first boolean-valued setting. true means every booking's fuel
-- charge is the flat base fee regardless of distance (see
-- computeFuelCharge's own comment for why: most bookings don't have real
-- customer coordinates to compute a distance from yet). Stays true here
-- so today's pricing is unchanged; an admin can flip it once real
-- distance-based fuel charging is wanted.
INSERT INTO platform_settings (key, value) VALUES
  ('matching_radius_km', '15'::jsonb),
  ('flat_fuel_charge', 'true'::jsonb);
