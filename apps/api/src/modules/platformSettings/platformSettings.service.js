import { ApiError } from '../../middleware/error.middleware.js';
import * as platformSettingsModel from './platformSettings.model.js';

// The only keys this round's Admin -> Settings screen exposes for editing
// (Piece D's fuel/travel-charge formula). The table itself is generic, but
// the API only lets an admin touch keys it already knows about, so a
// future setting is a migration seed row + an addition here, not a new
// endpoint.
// 'service_price_bands' (worker signup round) holds one JSONB map keyed by
// serviceId (`{ "<id>": { "min": n, "max": n } }`) rather than one row per
// service, so a new service never needs a migration to get a band - just
// an admin edit through this same key.
// 'get_quotes_window_minutes'/'get_quotes_cap' (quotes/booking_photos data
// foundation round) are unused until Phase 3 wires up the actual Get Quotes
// flow - added now so they're admin-editable through this same mechanism
// from day one rather than needing a second migration later.
// 'commission_rate' (Catalog & Pricing merge, target-spec Phase 4) used to
// be a hardcoded JS constant (commissionLedger.service.js's
// COMMISSION_RATE) - this is that same number, migrated here so there's
// one source of truth and an admin can actually change it. See
// getCommissionRate below for the read side.
// 'matching_radius_km'/'flat_fuel_charge' (Platform Configuration,
// target-spec Phase 6) were hardcoded JS constants in bookings.service.js
// (DEFAULT_RADIUS_KM, FLAT_FUEL_CHARGE) - same migration-to-one-source-of-
// truth move as commission_rate. flat_fuel_charge is this table's first
// boolean-valued setting (see AdminPlatformSettingUpdateInputSchema).
export const EDITABLE_KEYS = [
  'fuel_base_fee',
  'fuel_rate_per_km',
  'service_price_bands',
  'get_quotes_window_minutes',
  'get_quotes_cap',
  'commission_rate',
  'matching_radius_km',
  'flat_fuel_charge',
];

// Per-key checks beyond "a number or a boolean" (the shared Zod schema's
// job) - each key here has exactly one valid shape/range, and a bad value
// silently accepted would corrupt live matching or commission math on the
// very next booking, not just this request.
function assertValidValue(key, value) {
  if (key === 'commission_rate' && (value < 0 || value > 1)) {
    // A fraction of the job price (0.15 = 15%), not a percentage - plain
    // nonnegative-number validation would let an admin fat-finger 15
    // (1500%) straight into every future commission calculation.
    throw new ApiError(400, 'Commission rate must be between 0 and 1 (e.g. 0.15 for 15%)');
  }
  if (key === 'matching_radius_km' && !(typeof value === 'number' && value > 0)) {
    throw new ApiError(400, 'Matching radius must be a positive number of km');
  }
  if (key === 'flat_fuel_charge' && typeof value !== 'boolean') {
    throw new ApiError(400, 'Flat fuel charge must be true or false');
  }
}

export async function listSettings() {
  return platformSettingsModel.listSettings();
}

export async function updateSetting(key, value, adminId) {
  if (!EDITABLE_KEYS.includes(key)) throw new ApiError(404, 'Unknown setting');
  assertValidValue(key, value);
  const updated = await platformSettingsModel.setValue(key, value, adminId);
  if (!updated) throw new ApiError(404, 'Unknown setting');
  return updated;
}

// Read fresh on every call, never cached - an admin's edit on the Settings
// screen takes effect on the very next booking that reads this, with no
// redeploy or restart needed.
export async function getFuelPricing() {
  const [baseFee, ratePerKm] = await Promise.all([
    platformSettingsModel.getValue('fuel_base_fee'),
    platformSettingsModel.getValue('fuel_rate_per_km'),
  ]);
  return { baseFee: Number(baseFee ?? 0), ratePerKm: Number(ratePerKm ?? 0) };
}

// { "<serviceId>": { min, max } } - read fresh every call, same as
// getFuelPricing, so an admin's edit takes effect on the very next worker
// who hits the pricing step. Used both as a display hint (workers.service.js
// getServiceCatalog) and to decide whether a submitted price needs
// flagging into the admin review queue (workers.service.js
// saveOnboardingWork).
export async function getServicePriceBands() {
  const value = await platformSettingsModel.getValue('service_price_bands');
  return value ?? {};
}

// The platform's cut of a completed job's price - read fresh every call
// (same "no redeploy needed" pattern as getFuelPricing above), not cached
// or read once at boot. DEFAULT_COMMISSION_RATE only matters if the seed
// row (migration 051) were ever somehow missing - the real default the
// table is seeded with is the same 0.15 this constant documents.
const DEFAULT_COMMISSION_RATE = 0.15;

export async function getCommissionRate() {
  const value = await platformSettingsModel.getValue('commission_rate');
  return value === null ? DEFAULT_COMMISSION_RATE : Number(value);
}

// City-scale matching radius, read fresh every call (same pattern as
// getFuelPricing/getCommissionRate) - a change takes effect on the very
// next instant-booking match, no redeploy. DEFAULT_MATCHING_RADIUS_KM
// only matters if the seed row (migration 052) were ever somehow missing.
const DEFAULT_MATCHING_RADIUS_KM = 15;

export async function getMatchingRadiusKm() {
  const value = await platformSettingsModel.getValue('matching_radius_km');
  return value === null ? DEFAULT_MATCHING_RADIUS_KM : Number(value);
}

// Whether fuel/travel charge is the flat base-fee-only behavior (see
// bookings.service.js computeFuelCharge) or the real per-km distance
// calculation. Seeded true (migration 052) so today's pricing behavior is
// unchanged on deploy - see that migration's comment for why flat billing
// is currently correct (most bookings have no real customer coordinates
// to compute a distance from yet).
const DEFAULT_FLAT_FUEL_CHARGE = true;

export async function getFlatFuelCharge() {
  const value = await platformSettingsModel.getValue('flat_fuel_charge');
  return value === null ? DEFAULT_FLAT_FUEL_CHARGE : Boolean(value);
}

// Get Quotes (Phase 3) config - not read by anything yet in this round
// (quotes.service.js doesn't enforce a window or cap in Phase 1), exposed
// now so Phase 3 has a ready-made getter rather than inventing its own
// read path for these two keys.
export async function getQuotesSettings() {
  const [windowMinutes, cap] = await Promise.all([
    platformSettingsModel.getValue('get_quotes_window_minutes'),
    platformSettingsModel.getValue('get_quotes_cap'),
  ]);
  return { windowMinutes: Number(windowMinutes ?? 5), cap: Number(cap ?? 5) };
}
