import { ApiError } from '../../middleware/error.middleware.js';
import * as platformSettingsModel from './platformSettings.model.js';

// The only keys this round's Admin -> Settings screen exposes for editing
// (Piece D's fuel/travel-charge formula). The table itself is generic, but
// the API only lets an admin touch keys it already knows about, so a
// future setting is a migration seed row + an addition here, not a new
// endpoint.
export const EDITABLE_KEYS = ['fuel_base_fee', 'fuel_rate_per_km'];

export async function listSettings() {
  return platformSettingsModel.listSettings();
}

export async function updateSetting(key, value, adminId) {
  if (!EDITABLE_KEYS.includes(key)) throw new ApiError(404, 'Unknown setting');
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
