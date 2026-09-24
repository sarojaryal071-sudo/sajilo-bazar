import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button.jsx';
import { Input } from './Input.jsx';
import * as workersApi from '../api/workers.api.js';

// catalog arrives from GET /workers/catalog/services already sorted
// `ORDER BY category, name`, so this grouping preserves alphabetical order
// within each category for free - the only thing missing before was that
// the old flat <select> ignored that structure entirely.
function groupByCategory(services) {
  const grouped = {};
  for (const service of services) {
    (grouped[service.category] ??= []).push(service);
  }
  return grouped;
}

function ServicePicker({ grouped, selectedId, onSelect }) {
  const categories = Object.keys(grouped).sort();

  if (categories.length === 0) {
    return <p className="text-sm text-text-muted">Nothing here right now.</p>;
  }

  return (
    <div className="flex max-h-64 flex-col gap-4 overflow-y-auto pr-1">
      {categories.map((category) => (
        <div key={category}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{category}</p>
          <div className="flex flex-col gap-1.5">
            {grouped[category].map((s) => {
              const selected = selectedId === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    selected ? 'bg-brand text-text-onBrand' : 'bg-surface-alt text-text'
                  }`}
                >
                  <span>{s.name}</span>
                  {s.highRisk && (
                    <span className={`ml-2 shrink-0 text-xs font-medium ${selected ? 'text-text-onBrand/80' : 'text-danger'}`}>
                      High risk
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Lets a worker add a service beyond what they registered with at signup -
// picked from the existing catalog by id only, never free-text name or
// description (see workers.service.js's addService for the category-based
// approval logic this triggers server-side).
//
// Two modes: "own" (default) only shows services within the worker's
// already-verified category(ies) and goes live immediately. "other" shows
// every other category, with an upfront notice that it needs admin review;
// a high-risk category also requires a supporting document, submitted
// through the same upload flow verification documents already use.
export function AddServiceModal({ open, onClose, catalog, existingServiceIds, approvedCategories, onAdded }) {
  const [mode, setMode] = useState('own');
  const [serviceId, setServiceId] = useState(null);
  const [price, setPrice] = useState('');
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('own');
      setServiceId(null);
      setPrice('');
      setDocument(null);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const available = catalog.filter((s) => !existingServiceIds.includes(s.id));
  const ownCategoryServices = available.filter((s) => approvedCategories.includes(s.category));
  const otherCategoryServices = available.filter((s) => !approvedCategories.includes(s.category));
  const pool = mode === 'own' ? ownCategoryServices : otherCategoryServices;
  const grouped = groupByCategory(pool);

  const selectedService = pool.find((s) => s.id === serviceId);
  const requiresDocument = mode === 'other' && Boolean(selectedService?.highRisk);

  function selectService(id) {
    setServiceId(id);
    setPrice('');
    setDocument(null);
    setError('');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setServiceId(null);
    setPrice('');
    setDocument(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!serviceId) return setError('Choose a service to add.');
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return setError('Enter a valid price.');
    if (requiresDocument && !document) {
      return setError('This is a high-risk category - a supporting document is required.');
    }

    setSubmitting(true);
    try {
      const { service } = await workersApi.addService({ serviceId, price: priceNum, document });
      onAdded(service);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-surface-raised p-6 shadow-raised sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">
          {mode === 'own' ? 'Add a service' : 'Add a service from another category'}
        </h2>
        {mode === 'own' ? (
          <p className="mt-1 text-sm text-text-muted">
            Services in your verified {approvedCategories.length > 1 ? 'categories go' : 'category go'} live right
            away.
          </p>
        ) : (
          <p className="mt-1 text-sm text-warning">
            This needs admin review before it's bookable or visible to customers.
            {selectedService?.highRisk && ' This category also requires a supporting document.'}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <ServicePicker grouped={grouped} selectedId={serviceId} onSelect={selectService} />

          {serviceId && (
            <Input
              label="Your price (Rs.)"
              name="price"
              type="number"
              min="1"
              placeholder="e.g. 600"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          )}

          {requiresDocument && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-muted">Supporting document (required)</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
                className="rounded-md border border-border bg-surface px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-text-onBrand"
              />
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {mode === 'own' ? (
            otherCategoryServices.length > 0 && (
              <button
                type="button"
                onClick={() => switchMode('other')}
                className="text-left text-sm font-medium text-brand-solid"
              >
                + Add a service from another category
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => switchMode('own')}
              className="text-left text-sm font-medium text-text-muted"
            >
              &larr; Back to my categories
            </button>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || !serviceId}>
              {submitting ? 'Adding...' : 'Add service'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
