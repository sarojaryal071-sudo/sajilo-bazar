import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

// Piece D (fuel/travel charge, 2026-09-27) - the only two platform_settings
// keys this round exposes for editing. A future setting is a migration seed
// row + an addition to this map (and the server-side allowlist in
// platformSettings.service.js), not a new screen.
const SETTING_LABEL = {
  fuel_base_fee: 'Fuel/travel base fee (Rs.)',
  fuel_rate_per_km: 'Fuel/travel rate per km (Rs.)',
};

const SETTING_HELP = {
  fuel_base_fee: "Flat amount added to every new booking's fuel/travel charge, regardless of distance.",
  fuel_rate_per_km:
    "Added per km of distance between the customer's booking address and the assigned worker's saved location.",
};

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SettingEditor({ setting, busy, onSave }) {
  const [value, setValue] = useState(String(setting.value));
  const numeric = Number(value);
  const valid = value.trim() !== '' && !Number.isNaN(numeric) && numeric >= 0;
  const dirty = valid && numeric !== setting.value;

  return (
    <Card>
      <p className="font-semibold">{SETTING_LABEL[setting.key] ?? setting.key}</p>
      {SETTING_HELP[setting.key] && <p className="mt-1 text-xs text-text-muted">{SETTING_HELP[setting.key]}</p>}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        {dirty && (
          <Button variant="secondary" disabled={busy} onClick={() => onSave(numeric)} className="px-4 py-1.5 text-sm">
            {busy ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      {setting.updatedAt && (
        <p className="mt-2 text-xs text-text-muted">Last changed {formatDateTime(setting.updatedAt)}</p>
      )}
    </Card>
  );
}

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-xs text-text-muted">
        Platform-wide values used when pricing new bookings - a change here takes effect on the very next one, no
        redeploy needed.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!settings && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      <div className="mt-4 flex max-w-md flex-col gap-4">
        {settings
          // service_price_bands is a JSONB map (one row per service id), not
          // a plain number - it doesn't fit this generic numeric-value
          // editor, so it's edited per-service instead, from Admin ->
          // Categories, right next to the service it belongs to.
          ?.filter((setting) => setting.key !== 'service_price_bands')
          .map((setting) => (
            <SettingEditor
              key={setting.key}
              setting={setting}
              busy={busyKey === setting.key}
              onSave={(value) => handleSave(setting.key, value)}
            />
          ))}
      </div>
    </div>
  );
}
