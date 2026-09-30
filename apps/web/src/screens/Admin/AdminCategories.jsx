import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { SettingEditor } from '../../components/SettingEditor.jsx';
import * as adminApi from '../../api/admin.api.js';
import { humanizeCategory } from '../../lib/humanize.js';
import { SETTING_LABEL, SETTING_HELP } from '../../lib/platformSettingsLabels.js';

// Catalog & Pricing merge (target-spec Phase 4) - the platform_settings
// keys that actually price something, shown together above the category
// list. service_price_bands was already edited here (per-service, via
// PriceBandEditor below) before this phase; fuel_base_fee/fuel_rate_per_km
// moved from Admin -> Settings, and commission_rate is new (used to be a
// hardcoded JS constant - see commissionLedger.service.js).
const PRICING_KEYS = ['fuel_base_fee', 'fuel_rate_per_km', 'commission_rate'];

const EMPTY_FORM = { category: '', name: '', description: '' };

function ServiceForm({ initial, submitLabel, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          category: form.category.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
      }}
      className="flex flex-wrap items-start gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <input
        required
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        placeholder="Category"
        className="w-36 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <input
        required
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Service name"
        className="w-48 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <input
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Description (optional)"
        className="flex-1 min-w-[180px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PriceBandEditor({ serviceId, band, busy, onSave }) {
  const [min, setMin] = useState(band?.min ?? '');
  const [max, setMax] = useState(band?.max ?? '');
  const dirty =
    min !== '' && max !== '' && Number(min) >= 0 && Number(max) >= Number(min) &&
    (Number(min) !== band?.min || Number(max) !== band?.max);

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-muted">
      <span>Typical Rs.</span>
      <input
        type="number"
        min="0"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 text-xs outline-none focus:border-brand-solid"
      />
      <span>&ndash;</span>
      <input
        type="number"
        min="0"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 text-xs outline-none focus:border-brand-solid"
      />
      {dirty && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(serviceId, Number(min), Number(max))}
          className="font-medium text-brand-solid disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
      )}
    </div>
  );
}

export function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // Per-service min/max price band (platform_settings key
  // 'service_price_bands', same admin-editable pattern as fuel pricing -
  // see platformSettings.service.js). One JSONB map for every service, not
  // a row-per-service setting, so editing here never needs a migration.
  const [priceBands, setPriceBands] = useState({});
  const [bandBusyId, setBandBusyId] = useState(null);
  // Fuel base fee/rate + commission rate (PRICING_KEYS) - plain single-
  // value settings, rendered via the shared SettingEditor below rather
  // than the per-service band editor.
  const [pricingSettings, setPricingSettings] = useState(null);
  const [pricingBusyKey, setPricingBusyKey] = useState(null);

  function load() {
    adminApi
      .getCategoriesOverview()
      .then(({ categories }) => setCategories(categories))
      .catch((err) => setError(err.message));
    adminApi
      .listPlatformSettings()
      .then(({ settings }) => {
        const row = settings.find((s) => s.key === 'service_price_bands');
        setPriceBands(row?.value ?? {});
        setPricingSettings(settings.filter((s) => PRICING_KEYS.includes(s.key)));
      })
      .catch(() => {});
  }

  useEffect(load, []);

  async function handleSavePriceBand(serviceId, min, max) {
    setBandBusyId(serviceId);
    setError('');
    try {
      const nextBands = { ...priceBands, [serviceId]: { min, max } };
      await adminApi.updatePlatformSetting('service_price_bands', nextBands);
      setPriceBands(nextBands);
    } catch (err) {
      setError(err.message);
    } finally {
      setBandBusyId(null);
    }
  }

  async function handleSavePricingSetting(key, value) {
    setPricingBusyKey(key);
    setError('');
    try {
      await adminApi.updatePlatformSetting(key, value);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPricingBusyKey(null);
    }
  }

  async function handleCreate(input) {
    setBusyId('new');
    setError('');
    try {
      await adminApi.createService(input);
      setShowAddForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdate(id, input) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.updateService(id, input);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(service) {
    setBusyId(service.id);
    setError('');
    try {
      if (service.isActive) {
        await adminApi.deactivateService(service.id);
      } else {
        await adminApi.activateService(service.id);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Whether a worker adding this service from outside their verified
  // category needs to submit a supporting document (see AddServiceModal) -
  // admin data, not hardcoded by category.
  async function handleToggleHighRisk(service) {
    setBusyId(service.id);
    setError('');
    try {
      if (service.highRisk) {
        await adminApi.unmarkServiceHighRisk(service.id);
      } else {
        await adminApi.markServiceHighRisk(service.id);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalog &amp; Pricing</h1>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="px-4 py-2 text-sm">
            Add service
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Platform pricing</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {!pricingSettings && <p className="text-sm text-text-muted">Loading...</p>}
          {pricingSettings?.map((setting) => (
            <SettingEditor
              key={setting.key}
              setting={setting}
              label={SETTING_LABEL[setting.key]}
              help={SETTING_HELP[setting.key]}
              busy={pricingBusyKey === setting.key}
              onSave={(value) => handleSavePricingSetting(setting.key, value)}
              max={setting.key === 'commission_rate' ? '1' : undefined}
            />
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="mt-4">
          <ServiceForm
            initial={EMPTY_FORM}
            submitLabel="Create"
            busy={busyId === 'new'}
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {!categories && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {categories?.length === 0 && <p className="mt-4 text-sm text-text-muted">No services yet.</p>}

      <div className="mt-6 flex flex-col gap-4">
        {categories?.map((cat) => (
          <Card key={cat.category}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{humanizeCategory(cat.category)}</h2>
              {cat.pendingRequestCount > 0 && (
                <button
                  onClick={() => navigate('/admin/approvals')}
                  className="rounded-full"
                  title="Pending cross-category worker requests in this category - review in Approvals"
                >
                  <Badge tone="warning">{cat.pendingRequestCount} pending request{cat.pendingRequestCount === 1 ? '' : 's'}</Badge>
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {cat.services.map((service) =>
                editingId === service.id ? (
                  <ServiceForm
                    key={service.id}
                    initial={{ category: service.category, name: service.name, description: service.description || '' }}
                    submitLabel="Save"
                    busy={busyId === service.id}
                    onSubmit={(input) => handleUpdate(service.id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-text-muted">{service.description}</p>
                      )}
                      <div className="mt-1.5">
                        <PriceBandEditor
                          serviceId={service.id}
                          band={priceBands[String(service.id)]}
                          busy={bandBusyId === service.id}
                          onSave={handleSavePriceBand}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {service.highRisk && <Badge tone="danger">High risk</Badge>}
                      <Badge tone={service.isActive ? 'success' : 'neutral'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="secondary"
                        disabled={busyId === service.id}
                        onClick={() => setEditingId(service.id)}
                        className="px-3 py-1.5 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyId === service.id}
                        onClick={() => handleToggleHighRisk(service)}
                        className="px-3 py-1.5 text-xs"
                      >
                        {service.highRisk ? 'Unmark high risk' : 'Mark high risk'}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyId === service.id}
                        onClick={() => handleToggleActive(service)}
                        className="px-3 py-1.5 text-xs"
                      >
                        {busyId === service.id ? 'Working...' : service.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                )
              )}
              {cat.services.length === 0 && (
                <p className="text-sm text-text-muted">No services in this category yet.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
