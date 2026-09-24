import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { Input } from '../../components/Input.jsx';
import { Button } from '../../components/Button.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';

const RESPONSE_DEADLINE_PRESETS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
];

// Earliest value the datetime-local input will accept - a couple minutes
// out so "now" isn't itself a valid schedule pick.
function minScheduledFor() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function BookingRequest() {
  const { workerId, serviceIds } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [mode, setMode] = useState('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [responseDeadlineHours, setResponseDeadlineHours] = useState(6);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = serviceIds
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  useEffect(() => {
    workersApi
      .getDetail(workerId)
      .then(({ worker }) => setWorker(worker))
      .catch((err) => setLoadError(err.message));
  }, [workerId]);

  if (loadError) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <p className="text-sm text-danger">{loadError}</p>
      </Screen>
    );
  }

  if (!worker) return null;

  const services = selectedIds
    .map((id) => worker.services.find((s) => s.id === id))
    .filter(Boolean);

  if (services.length === 0) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <p className="text-sm text-danger">These services are no longer offered.</p>
      </Screen>
    );
  }

  const total = services.reduce((sum, s) => sum + s.price, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (addressLabel.trim().length < 3) {
      return setError('Enter the address where the worker should come.');
    }
    if (mode === 'schedule' && !scheduledFor) {
      return setError('Pick a date and time.');
    }
    setSubmitting(true);
    try {
      const { booking } = await bookingsApi.create({
        workerId: Number(workerId),
        serviceIds: services.map((s) => s.id),
        addressLabel: addressLabel.trim(),
        ...(mode === 'schedule'
          ? { scheduledFor: new Date(scheduledFor).toISOString(), responseDeadlineHours }
          : {}),
      });
      navigate(`/booking/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">Confirm booking</h1>

      <Card className="mt-4 flex items-center gap-4">
        <Avatar name={worker.fullName} imageUrl={worker.profileImageUrl} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{worker.fullName}</p>
          <p className="text-sm text-text-muted">
            {services.length} service{services.length === 1 ? '' : 's'} selected
          </p>
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{service.name}</span>
              <span className="font-medium">Rs. {service.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold">Rs. {total}</span>
        </div>
      </Card>

      <div className="mt-6 flex gap-2 rounded-full bg-surface-alt p-1">
        {['now', 'schedule'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-brand text-text-onBrand shadow-resting' : 'text-text-muted'
            }`}
          >
            {m === 'now' ? 'Now' : 'Schedule for later'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Input
          label="Address"
          name="addressLabel"
          placeholder="Where should the worker come?"
          value={addressLabel}
          onChange={(e) => setAddressLabel(e.target.value)}
        />

        {mode === 'schedule' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-muted">Date &amp; time</span>
              <input
                type="datetime-local"
                min={minScheduledFor()}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-text-muted">
                If {worker.fullName} doesn't respond within
              </span>
              <div className="mt-2 flex gap-2">
                {RESPONSE_DEADLINE_PRESETS.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setResponseDeadlineHours(preset.hours)}
                    className={`flex-1 rounded-full border py-2 text-sm font-medium transition-colors ${
                      responseDeadlineHours === preset.hours
                        ? 'border-brand-solid bg-brand-solid/10 text-brand-solid'
                        : 'border-border text-text-muted'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-muted">the request expires and you can try someone else.</p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? 'Sending request...'
            : mode === 'schedule'
              ? `Send scheduled request - Rs. ${total}`
              : `Request booking - Rs. ${total}`}
        </Button>
      </form>
    </Screen>
  );
}
