import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { Input } from '../../components/Input.jsx';
import { Button } from '../../components/Button.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';

export function BookingRequest() {
  const { workerId, serviceId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const service = worker.services.find((s) => s.id === Number(serviceId));
  if (!service) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <p className="text-sm text-danger">This service is no longer offered.</p>
      </Screen>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (addressLabel.trim().length < 3) {
      return setError('Enter the address where the worker should come.');
    }
    setSubmitting(true);
    try {
      const { booking } = await bookingsApi.create({
        workerId: Number(workerId),
        serviceId: Number(serviceId),
        addressLabel: addressLabel.trim(),
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
          <p className="text-sm text-text-muted">{service.name}</p>
        </div>
        <p className="font-semibold">Rs. {service.price}</p>
      </Card>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Address"
          name="addressLabel"
          placeholder="Where should the worker come?"
          value={addressLabel}
          onChange={(e) => setAddressLabel(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Sending request...' : `Request booking - Rs. ${service.price}`}
        </Button>
      </form>
    </Screen>
  );
}
