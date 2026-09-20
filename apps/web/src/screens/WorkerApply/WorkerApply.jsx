import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import * as workersApi from '../../api/workers.api.js';

const STEPS = ['services', 'documents'];

export function WorkerApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState({}); // { [serviceId]: price }
  const [bio, setBio] = useState('');
  const [documents, setDocuments] = useState({ citizenship: null, certificate: null });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    workersApi.getServiceCatalog().then(({ services }) => setCatalog(services));
  }, []);

  function toggleService(id) {
    setSelected((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = '';
      return next;
    });
  }

  function setPrice(id, price) {
    setSelected((prev) => ({ ...prev, [id]: price }));
  }

  function goToDocuments(e) {
    e.preventDefault();
    setError('');
    const services = Object.entries(selected);
    if (services.length === 0) return setError('Choose at least one service you offer.');
    if (services.some(([, price]) => !price || Number(price) <= 0)) {
      return setError('Set a price for every service you selected.');
    }
    setStep(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!documents.citizenship) return setError('Citizenship document is required.');

    setSubmitting(true);
    try {
      const services = Object.entries(selected).map(([serviceId, price]) => ({
        serviceId: Number(serviceId),
        price: Number(price),
      }));
      await workersApi.apply({ bio, services, documents });
      navigate('/worker/status');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const byCategory = catalog.reduce((acc, service) => {
    (acc[service.category] ??= []).push(service);
    return acc;
  }, {});

  return (
    <Screen>
      <h1 className="text-2xl font-bold">Apply as a worker</h1>
      <p className="mt-1 text-text-muted">
        Step {step + 1} of {STEPS.length}: {step === 0 ? 'Your services' : 'Verification documents'}
      </p>

      {step === 0 && (
        <form onSubmit={goToDocuments} className="mt-6 flex flex-col gap-4">
          {Object.entries(byCategory).map(([category, services]) => (
            <div key={category}>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                {category}
              </p>
              <div className="flex flex-col gap-3">
                {services.map((service) => (
                  <Card key={service.id} className="flex items-center justify-between gap-3">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={service.id in selected}
                        onChange={() => toggleService(service.id)}
                        className="h-5 w-5 accent-brand-solid"
                      />
                      <span>{service.name}</span>
                    </label>
                    {service.id in selected && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Price (Rs.)"
                        value={selected[service.id]}
                        onChange={(e) => setPrice(service.id, e.target.value)}
                        className="w-28 rounded-md border border-border bg-surface px-3 py-2 text-right outline-none focus:border-brand-solid"
                      />
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="mt-2 w-full">
            Continue
          </Button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              Tell customers about yourself (optional)
            </span>
            <textarea
              name="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
            />
          </label>

          <FileField
            label="Citizenship document (required)"
            onChange={(file) => setDocuments((prev) => ({ ...prev, citizenship: file }))}
          />
          <FileField
            label="Skill certificate (optional)"
            onChange={(file) => setDocuments((prev) => ({ ...prev, certificate: file }))}
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Submitting...' : 'Submit application'}
            </Button>
          </div>
        </form>
      )}
    </Screen>
  );
}

function FileField({ label, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="rounded-md border border-border bg-surface px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-text-onBrand"
      />
    </label>
  );
}
