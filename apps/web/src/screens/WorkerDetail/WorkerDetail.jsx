import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { Button } from '../../components/Button.jsx';
import { ReviewsList } from '../../components/ReviewsList.jsx';
import { VerifiedBadge } from '../../components/VerifiedBadge.jsx';
import * as workersApi from '../../api/workers.api.js';

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  );
}

export function WorkerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  function toggleService(serviceId) {
    setSelectedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }

  useEffect(() => {
    workersApi
      .getDetail(id)
      .then(({ worker }) => setWorker(worker))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <p className="text-sm text-danger">{error}</p>
      </Screen>
    );
  }

  if (!worker) return null;

  const selectedTotal = worker.services
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  function handleBookSelected() {
    navigate(`/book/${worker.userId}/${selectedIds.join(',')}`);
  }

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={worker.fullName} imageUrl={worker.profileImageUrl} size={72} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{worker.fullName}</h1>
            {worker.verificationStatus === 'approved' && <VerifiedBadge />}
          </div>
          {worker.handle && <p className="text-sm text-text-muted">{worker.handle}</p>}
          {worker.serviceAreaLabel && (
            <p className="text-sm text-text-muted">{worker.serviceAreaLabel}</p>
          )}
          <div className="mt-1 flex items-center gap-1 text-sm text-warning">
            <StarIcon />
            <span className="font-medium">{worker.ratingAvg.toFixed(1)}</span>
            <span className="text-text-muted">
              &middot; {worker.jobsCompletedCount} job{worker.jobsCompletedCount === 1 ? '' : 's'} done
              &middot; {worker.reviewsCount} review{worker.reviewsCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {worker.bio && <p className="mt-4 text-sm text-text-muted">{worker.bio}</p>}

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Services
      </p>
      <p className="-mt-2 mb-3 text-xs text-text-muted">Select one or more to book together.</p>
      <div className="flex flex-col gap-2">
        {worker.services.map((service) => {
          const selected = selectedIds.includes(service.id);
          return (
            <Card
              key={service.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleService(service.id)}
              className={`flex cursor-pointer items-center gap-3 py-3 ${
                selected ? 'ring-2 ring-brand-solid' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleService(service.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 shrink-0 accent-brand-solid"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{service.name}</p>
                <p className="text-xs capitalize text-text-muted">{service.category}</p>
              </div>
              <p className="shrink-0 font-semibold">Rs. {service.price}</p>
            </Card>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <Card className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted">
              {selectedIds.length} service{selectedIds.length === 1 ? '' : 's'} selected
            </p>
            <p className="text-lg font-bold">Rs. {selectedTotal}</p>
          </div>
          <Button onClick={handleBookSelected}>Book selected services</Button>
        </Card>
      )}

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Reviews
      </p>
      <ReviewsList reviews={worker.reviews} reviewsCount={worker.reviewsCount} />
    </Screen>
  );
}
