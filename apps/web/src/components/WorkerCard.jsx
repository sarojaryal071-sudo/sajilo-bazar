import { Card } from './Card.jsx';
import { Avatar } from './Avatar.jsx';
import { VerifiedBadge } from './VerifiedBadge.jsx';

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  );
}

// Shared by Search results - one worker, their cheapest matching service.
export function WorkerCard({ worker, onClick }) {
  return (
    <Card whileTap={{ scale: 0.98 }} onClick={onClick} className="flex cursor-pointer items-center gap-4">
      <Avatar name={worker.fullName} imageUrl={worker.profileImageUrl} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold">{worker.fullName}</p>
          {worker.verificationStatus === 'approved' && <VerifiedBadge className="shrink-0" />}
        </div>
        <p className="truncate text-sm text-text-muted">{worker.matchedService.name}</p>
        {worker.serviceAreaLabel && (
          <p className="truncate text-xs text-text-muted">{worker.serviceAreaLabel}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="font-semibold">Rs. {worker.matchedService.price}</p>
        <div className="flex items-center gap-1 text-xs text-warning">
          <StarIcon />
          {worker.ratingAvg.toFixed(1)}
        </div>
      </div>
    </Card>
  );
}
