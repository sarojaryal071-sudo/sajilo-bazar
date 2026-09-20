import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { ReviewModal } from '../../components/ReviewModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as bookingsApi from '../../api/bookings.api.js';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/bookingStatus.js';

const STEPS = ['requested', 'accepted', 'in_progress', 'completed'];

function StatusTracker({ status }) {
  const stepIndex = STEPS.indexOf(status);
  return (
    <div className="mt-6 flex items-center">
      {STEPS.map((step, i) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`h-3 w-3 rounded-full ${i <= stepIndex ? 'bg-brand-solid' : 'bg-surface-alt'}`} />
            <span className="text-[10px] capitalize text-text-muted">{BOOKING_STATUS_LABEL[step]}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-1 h-0.5 flex-1 ${i < stepIndex ? 'bg-brand-solid' : 'bg-surface-alt'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function CancelSection({ busy, onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={2}
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
      />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
          Keep booking
        </Button>
        <Button className="flex-1" disabled={busy} onClick={() => onCancel(reason.trim() || null)}>
          Confirm cancel
        </Button>
      </div>
    </div>
  );
}

export function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = useCallback(() => {
    bookingsApi
      .getDetail(id)
      .then(({ booking }) => setBooking(booking))
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (booking?.status !== 'completed') return;
    bookingsApi
      .getReview(id)
      .then(({ review }) => setReview(review))
      .catch(() => {});
  }, [booking?.status, id]);

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

  if (!booking) return null;

  const isWorker = user.role === 'worker';
  const otherName = isWorker ? booking.customerName : booking.workerName;
  const otherImage = isWorker ? booking.customerImageUrl : booking.workerImageUrl;
  const isTerminalNonCompleted = booking.status === 'cancelled' || booking.status === 'declined';

  async function runAction(action) {
    setActionError('');
    setBusy(true);
    try {
      const { booking: updated } = await action();
      setBooking(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewSubmit({ rating, comment }) {
    const { review: created } = await bookingsApi.createReview(id, { rating, comment });
    setReview(created);
    setReviewOpen(false);
  }

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={otherName} imageUrl={otherImage} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{otherName}</p>
          <p className="text-sm text-text-muted">{booking.serviceName}</p>
        </div>
        <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
      </div>

      {isTerminalNonCompleted ? (
        <Card className="mt-6">
          <p className="font-semibold">{BOOKING_STATUS_LABEL[booking.status]}</p>
          {booking.cancelReason && <p className="mt-1 text-sm text-text-muted">{booking.cancelReason}</p>}
        </Card>
      ) : (
        <StatusTracker status={booking.status} />
      )}

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="shrink-0 text-text-muted">Address</span>
          <span className="text-right font-medium">{booking.addressLabel}</span>
        </div>
        {booking.price !== null && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-text-muted">Price</span>
            <span className="font-semibold">Rs. {booking.price}</span>
          </div>
        )}
      </Card>

      {review && (
        <Card className="mt-4">
          <p className="font-semibold">Your review</p>
          <p className="mt-1 text-warning">
            {'★'.repeat(review.rating)}
            {'☆'.repeat(5 - review.rating)}
          </p>
          {review.comment && <p className="mt-1 text-sm text-text-muted">{review.comment}</p>}
        </Card>
      )}

      {actionError && <p className="mt-4 text-sm text-danger">{actionError}</p>}

      <div className="mt-6 flex flex-col gap-3">
        <Button variant="secondary" onClick={() => navigate(`/booking/${id}/chat`)}>
          Chat
        </Button>

        {isWorker && booking.status === 'requested' && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => runAction(() => bookingsApi.decline(id))}
            >
              Decline
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => runAction(() => bookingsApi.accept(id))}>
              Accept
            </Button>
          </div>
        )}
        {isWorker && booking.status === 'accepted' && (
          <Button disabled={busy} onClick={() => runAction(() => bookingsApi.start(id))}>
            Start job
          </Button>
        )}
        {isWorker && booking.status === 'in_progress' && (
          <Button disabled={busy} onClick={() => runAction(() => bookingsApi.complete(id))}>
            Mark complete
          </Button>
        )}
        {!isWorker && ['requested', 'accepted'].includes(booking.status) && (
          <CancelSection busy={busy} onCancel={(reason) => runAction(() => bookingsApi.cancel(id, reason))} />
        )}
        {!isWorker && booking.status === 'completed' && !review && (
          <Button onClick={() => setReviewOpen(true)}>Leave a review</Button>
        )}
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} onSubmit={handleReviewSubmit} />
    </Screen>
  );
}
