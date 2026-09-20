import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Input } from '../../components/Input.jsx';
import { Button } from '../../components/Button.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';
import { getCurrentLocation } from '../../lib/geolocation.js';

export function InstantRequest() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [serviceId, setServiceId] = useState(null);
  const [addressLabel, setAddressLabel] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    workersApi
      .getServiceCatalog()
      .then(({ services }) => {
        const byCategory = services.reduce((acc, service) => {
          (acc[service.category] ??= []).push(service);
          return acc;
        }, {});
        setCategories(Object.entries(byCategory));
      })
      .catch(() => setLoadError('Could not load services right now.'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!serviceId) return setError('Choose what you need help with.');
    if (addressLabel.trim().length < 3) return setError('Enter the address where the worker should come.');

    setSubmitting(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      const { booking } = await bookingsApi.createInstant({
        serviceId,
        addressLabel: addressLabel.trim(),
        latitude,
        longitude,
      });
      navigate(`/booking/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">Instant request</h1>
      <p className="mt-1 text-sm text-text-muted">
        We&apos;ll notify nearby online workers right away - the first to accept gets the job.
      </p>

      {loadError && <p className="mt-4 text-sm text-danger">{loadError}</p>}
      {!categories && !loadError && <p className="mt-4 text-sm text-text-muted">Loading services...</p>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {categories?.map(([category, services]) => (
          <div key={category}>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">{category}</p>
            <div className="flex flex-col gap-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setServiceId(service.id)}
                  className={`cursor-pointer py-3 ${
                    serviceId === service.id ? 'ring-2 ring-brand-solid' : ''
                  }`}
                >
                  <p className="font-medium">{service.name}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <Input
          label="Address"
          name="addressLabel"
          placeholder="Where should the worker come?"
          value={addressLabel}
          onChange={(e) => setAddressLabel(e.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Finding nearby workers...' : 'Send instant request'}
        </Button>
      </form>
    </Screen>
  );
}
