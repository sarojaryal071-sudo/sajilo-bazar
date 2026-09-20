import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button.jsx';
import { Input } from './Input.jsx';
import * as workersApi from '../api/workers.api.js';

// Lets a worker add a service beyond what they registered with at signup -
// picked from the existing catalog by id only, never free-text name or
// description (see workers.service.js's addService for the category-based
// approval logic this triggers server-side).
export function AddServiceModal({ open, onClose, catalog, existingServiceIds, onAdded }) {
  const [serviceId, setServiceId] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const available = catalog.filter((s) => !existingServiceIds.includes(s.id));

  useEffect(() => {
    if (open) {
      setServiceId('');
      setPrice('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!serviceId) return setError('Choose a service to add.');
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return setError('Enter a valid price.');

    setSubmitting(true);
    try {
      const { service } = await workersApi.addService({ serviceId: Number(serviceId), price: priceNum });
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
        <h2 className="text-lg font-bold">Add a service</h2>
        <p className="mt-1 text-sm text-text-muted">
          Adding a service in a category you're already approved for goes live right away. A new
          category is reviewed before it's bookable.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Service</span>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
            >
              <option value="">Choose a service...</option>
              {available.length === 0 ? (
                <option disabled>You already offer every catalog service</option>
              ) : (
                available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category} - {s.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <Input
            label="Your price (Rs.)"
            name="price"
            type="number"
            min="1"
            placeholder="e.g. 600"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add service'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
