import { Card } from './Card.jsx';
import { Avatar } from './Avatar.jsx';
import { Badge } from './Badge.jsx';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../lib/bookingStatus.js';

// Shared by the customer Bookings list and worker Jobs list - viewerRole
// decides which side of the booking to show as "the other person". An
// instant request has no worker until one's assigned, so otherName can be
// null on the customer's side - show a placeholder rather than a blank row.
export function BookingListItem({ booking, viewerRole, onClick }) {
  const otherName = viewerRole === 'worker' ? booking.customerName : booking.workerName;
  const otherImage = viewerRole === 'worker' ? booking.customerImageUrl : booking.workerImageUrl;
  const otherHandle = viewerRole === 'worker' ? null : booking.workerHandle;
  const displayName = otherName ?? 'Finding a worker...';

  return (
    <Card
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-4"
    >
      <Avatar name={otherName} imageUrl={otherImage} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {displayName}
          {otherHandle && <span className="ml-1.5 font-normal text-text-muted">{otherHandle}</span>}
        </p>
        <p className="truncate text-sm text-text-muted">
          {booking.services.map((s) => s.name).join(', ')}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {booking.price !== null && <p className="text-sm font-semibold">Rs. {booking.price}</p>}
        <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
      </div>
    </Card>
  );
}
