import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

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

export function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .getCategoriesOverview()
      .then(setCategories)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories/Services</h1>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="px-4 py-2 text-sm">
            Add service
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

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
              <h2 className="text-lg font-semibold capitalize">{cat.category}</h2>
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
                    </div>
                    <div className="flex items-center gap-2">
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
