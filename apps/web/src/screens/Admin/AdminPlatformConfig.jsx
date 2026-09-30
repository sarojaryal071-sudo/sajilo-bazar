import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { SettingEditor } from '../../components/SettingEditor.jsx';
import * as adminApi from '../../api/admin.api.js';

// Districts (target-spec Phase 6) - the districts table (migration 041)
// and its is_active column (migration 042) already existed with no admin
// write-path at all; this is that write-path's first UI. Lists every
// district including inactive ones (unlike the public GET /catalog/
// districts, which only ever returns active rows - untouched by this
// round).
function NewDistrictForm({ busy, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), isActive });
      }}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="District name"
        className="w-48 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active immediately
      </label>
      <p className="w-full text-xs text-text-muted">
        Leave "Active immediately" unchecked to pre-seed a district ahead of launch - it won't appear in
        signup/address pickers until activated below.
      </p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Creating...' : 'Create'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DistrictRow({ district, busy, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <p className="text-sm font-medium">{district.name}</p>
      <div className="flex items-center gap-2">
        <Badge tone={district.isActive ? 'success' : 'neutral'}>{district.isActive ? 'Active' : 'Inactive'}</Badge>
        <Button variant="secondary" disabled={busy} onClick={onToggle} className="px-3 py-1.5 text-xs">
          {busy ? 'Working...' : district.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </div>
  );
}

function DistrictsSection() {
  const [districts, setDistricts] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .listDistricts()
      .then(({ districts }) => setDistricts(districts))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(input) {
    setCreating(true);
    setError('');
    try {
      await adminApi.createDistrict(input);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(district) {
    setBusyId(district.id);
    setError('');
    try {
      if (district.isActive) {
        await adminApi.deactivateDistrict(district.id);
      } else {
        await adminApi.activateDistrict(district.id);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Districts</p>
          <p className="text-xs text-text-muted">Which districts are open for worker signup and booking addresses.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            New district
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mt-3">
          <NewDistrictForm busy={creating} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {!districts && !error && <p className="mt-3 text-sm text-text-muted">Loading...</p>}
      {districts?.length === 0 && <p className="mt-3 text-sm text-text-muted">No districts yet.</p>}

      <div className="mt-3 flex flex-col gap-2">
        {districts?.map((d) => (
          <DistrictRow key={d.id} district={d} busy={busyId === d.id} onToggle={() => handleToggle(d)} />
        ))}
      </div>
    </Card>
  );
}

// Matching radius + flat fuel charge (target-spec Phase 6) - both used to
// be hardcoded JS constants in bookings.service.js (DEFAULT_RADIUS_KM,
// FLAT_FUEL_CHARGE), now admin-editable platform_settings. Radius reuses
// the existing numeric SettingEditor; flat_fuel_charge is this table's
// first boolean-valued setting, so it gets its own small toggle card
// rather than forcing it through the numeric editor.
function BooleanSettingToggle({ setting, label, help, busy, onSave }) {
  const [value, setValue] = useState(Boolean(setting.value));
  const dirty = value !== Boolean(setting.value);

  return (
    <Card>
      <p className="font-semibold">{label}</p>
      {help && <p className="mt-1 text-xs text-text-muted">{help}</p>}
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value} onChange={(e) => setValue(e.target.checked)} />
          {value ? 'On (flat base fee for every booking)' : 'Off (real per-km distance charge)'}
        </label>
        {dirty && (
          <Button variant="secondary" disabled={busy} onClick={() => onSave(value)} className="px-4 py-1.5 text-sm">
            {busy ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function MatchingSection() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  function load() {
    adminApi
      .listPlatformSettings()
      .then(({ settings }) => setSettings(settings.filter((s) => ['matching_radius_km', 'flat_fuel_charge'].includes(s.key))))
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

  const radius = settings?.find((s) => s.key === 'matching_radius_km');
  const flatFuel = settings?.find((s) => s.key === 'flat_fuel_charge');

  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Matching &amp; pricing</p>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      {!settings && !error && <p className="text-sm text-text-muted">Loading...</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {radius && (
          <SettingEditor
            setting={radius}
            label="Matching radius (km)"
            help="How far from the customer an instant booking looks for online workers."
            busy={busyKey === 'matching_radius_km'}
            onSave={(value) => handleSave('matching_radius_km', value)}
            step="1"
          />
        )}
        {flatFuel && (
          <BooleanSettingToggle
            setting={flatFuel}
            label="Flat fuel charge"
            help="When on, every booking's fuel/travel charge is the flat base fee (Catalog & Pricing) regardless of distance. Turn off to charge the real per-km rate once customer coordinates are reliably available."
            busy={busyKey === 'flat_fuel_charge'}
            onSave={(value) => handleSave('flat_fuel_charge', value)}
          />
        )}
      </div>
    </div>
  );
}

export function AdminPlatformConfig() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Platform Configuration</h1>
      <p className="mt-1 text-xs text-text-muted">
        Where the platform operates and how it matches/charges - separate from Catalog &amp; Pricing
        (service catalog, fuel fee, commission) and Settings (Get Quotes config).
      </p>

      <div className="mt-4 flex flex-col gap-6">
        <DistrictsSection />
        <MatchingSection />
      </div>
    </div>
  );
}
