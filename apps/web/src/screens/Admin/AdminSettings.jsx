import { useEffect, useState } from 'react';
import { SettingEditor } from '../../components/SettingEditor.jsx';
import * as adminApi from '../../api/admin.api.js';

// Catalog & Pricing merge (target-spec Phase 4) moved fuel_base_fee,
// fuel_rate_per_km, and service_price_bands onto Admin -> Categories,
// next to the service/category management they price - see
// AdminCategories.jsx's "Platform pricing" card. What's left here isn't a
// thin leftover shell, though: get_quotes_window_minutes/get_quotes_cap
// are real, unrelated config (the Get Quotes flow's timing/cap, not
// pricing), so this screen keeps its own place rather than becoming an
// empty redirect.
const MOVED_TO_CATEGORIES = ['fuel_base_fee', 'fuel_rate_per_km', 'service_price_bands', 'commission_rate'];

const SETTING_LABEL = {
  get_quotes_window_minutes: 'Get Quotes response window (minutes)',
  get_quotes_cap: 'Get Quotes max responses per request',
};

export function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  function load() {
    adminApi
      .listPlatformSettings()
      .then(({ settings }) => setSettings(settings))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSave(key, value) {
    setBusyKey(key);
    setError('');
    try {
      await adminApi.updatePlatformSetting(key, value);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  const visibleSettings = settings?.filter((setting) => !MOVED_TO_CATEGORIES.includes(setting.key));

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-xs text-text-muted">
        Platform-wide config not tied to pricing - fuel/travel charges, service price bands, and the
        commission rate moved to Categories/Services. A change here takes effect immediately, no redeploy
        needed.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!settings && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {visibleSettings?.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">Nothing configurable here right now.</p>
      )}

      <div className="mt-4 flex max-w-md flex-col gap-4">
        {visibleSettings?.map((setting) => (
          <SettingEditor
            key={setting.key}
            setting={setting}
            label={SETTING_LABEL[setting.key]}
            busy={busyKey === setting.key}
            onSave={(value) => handleSave(setting.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
