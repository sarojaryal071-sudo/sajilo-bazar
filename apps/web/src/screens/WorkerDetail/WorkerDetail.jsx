import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { Button } from '../../components/Button.jsx';
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

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={worker.fullName} imageUrl={worker.profileImageUrl} size={72} />
        <div>
          <h1 className="text-xl font-bold">{worker.fullName}</h1>
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
      <div className="flex flex-col gap-2">
        {worker.services.map((service) => (
          <Card key={service.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-xs capitalize text-text-muted">{service.category}</p>
            </div>
            <p className="font-semibold">Rs. {service.price}</p>
          </Card>
        ))}
      </div>

      <Button disabled className="mt-8 w-full opacity-50">
        Book - coming soon
      </Button>
    </Screen>
  );
}
