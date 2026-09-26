import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { NoWorkerAvatar } from '../../components/NoWorkerAvatar.jsx';
import { SkeletonBlock } from '../../components/Skeleton.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { ReviewModal } from '../../components/ReviewModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useIsDesktop } from '../../hooks/useIsDesktop.js';
import * as bookingsApi from '../../api/bookings.api.js';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE, NO_WORKER_TERMINAL_STATUSES } from '../../lib/bookingStatus.js';
import { WORKER_DESKTOP_BLOCK_MESSAGE, WORKER_ACTIVE_BOOKING_STATUSES } from '../../lib/workerDesktopBlock.js';

const STEPS = ['requested', 'accepted', 'in_progress', 'completed'];
const WAITING_POLL_MS = 4000;

function RadarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 12 18 8" strokeLinecap="round" />
    </svg>
  );
}

// Live "waiting for a worker" state for an unclaimed instant request -
// pulses while polling/listening for booking:assigned, so the customer
// isn't staring at a static screen while nearby workers are being notified.
function WaitingForWorker() {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-text-onBrand"
      >
        <RadarIcon />
      </motion.div>
      <div>
        <p className="font-semibold">Looking for a nearby worker...</p>
        <p className="mt-1 text-sm text-text-muted">
          {elapsedSec < 30
            ? "We've notified nearby online workers - first to accept gets the job."
            : "Still looking - this is taking longer than usual. You can keep waiting or cancel."}
        </p>
      </div>
    </Card>
  );
}

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

// Worker's "Mark complete" step - confirms the job's final price (prefilled
// with the booking's current price, editable in case the actual job cost
// differs from the original estimate) and payment method. Cash is the only
// selectable option; eSewa is a disabled placeholder establishing the UI
// seam for later (business plan §6) - the backend rejects anything but
// 'cash' anyway (CompleteBookingInputSchema).
function CompleteSection({ busy, defaultPrice, onComplete }) {
  const [open, setOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState(defaultPrice != null ? String(defaultPrice) : '');

  if (!open) {
    return (
      <Button disabled={busy} onClick={() => setOpen(true)}>
        Mark complete
      </Button>
    );
  }

  const priceValue = Number(finalPrice);
  const priceValid = finalPrice.trim() !== '' && priceValue > 0;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <label className="text-sm text-text-muted" htmlFor="final-price">
          Final price (Rs.)
        </label>
        <input
          id="final-price"
          type="number"
          min="1"
          step="1"
          value={finalPrice}
          onChange={(e) => setFinalPrice(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
        />
      </div>
      <div>
        <p className="text-sm text-text-muted">Payment method</p>
        <div className="mt-1 flex gap-2">
          <div className="flex-1 rounded-md border-2 border-brand-solid bg-brand/10 px-3 py-2 text-sm font-medium">
            Cash
          </div>
          <div className="flex flex-1 items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-muted opacity-60">
            <span>eSewa</span>
            <Badge tone="neutral">Coming soon</Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={busy || !priceValid} onClick={() => onComplete(priceValue)}>
          Confirm complete
        </Button>
      </div>
    </Card>
  );
}

// "Report a problem" - the missing self-service entry point into the
// disputes table admin already has a full list/detail/resolve screen for
// (Round C). Once filed for this session, it just confirms rather than
// letting the same visit file a duplicate.
function ReportProblemSection({ busy, filed, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (filed) {
    return <p className="text-sm text-text-muted">Your report has been sent to our support team.</p>;
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Report a problem
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={3}
        placeholder="What went wrong?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
      />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={busy || !reason.trim()}
          onClick={() => onSubmit(reason.trim())}
        >
          Submit report
        </Button>
      </div>
    </div>
  );
}

export function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const isDesktop = useIsDesktop();
  const [booking, setBooking] = useState(null);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [disputeFiled, setDisputeFiled] = useState(false);

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

  const isInstantWaiting = booking?.type === 'instant' && booking?.status === 'requested' && !booking?.workerId;

  // Live push for the customer waiting on an instant request - falls
  // through instantly once a worker claims it, no need to wait for the
  // polling fallback below.
  useEffect(() => {
    if (!socket || !isInstantWaiting) return;
    function onAssigned({ booking: updated }) {
      if (updated.id === Number(id)) setBooking(updated);
    }
    socket.on('booking:assigned', onAssigned);
    return () => socket.off('booking:assigned', onAssigned);
  }, [socket, isInstantWaiting, id]);

  // Polling fallback in case the socket isn't connected (or missed the
  // event) - same source of truth either way.
  useEffect(() => {
    if (!isInstantWaiting) return;
    const interval = setInterval(load, WAITING_POLL_MS);
    return () => clearInterval(interval);
  }, [isInstantWaiting, load]);

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

  if (!booking) {
    return (
      <Screen>
        <SkeletonBlock className="h-4 w-12" />
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
          <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
        </div>
        <SkeletonBlock className="mt-6 h-32 w-full rounded-2xl" />
        <SkeletonBlock className="mt-4 h-12 w-full rounded-full" />
      </Screen>
    );
  }

  const isWorker = user.role === 'worker';

  // Founder decision 2026-09-26: the active in-progress job screen is
  // mobile-only for a worker - accept/decline (requested), start job
  // (accepted), and chat + mark-complete (in_progress) all live on this one
  // shared screen, so blocking it here in one place covers all of them at
  // once rather than gating each action button separately. A completed/
  // cancelled/declined booking is just history, which stays fully
  // desktop-usable (see WORKER_ACTIVE_BOOKING_STATUSES).
  if (isWorker && isDesktop && WORKER_ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="max-w-sm text-base font-medium text-text-muted">{WORKER_DESKTOP_BLOCK_MESSAGE}</p>
        </div>
      </Screen>
    );
  }

  const otherName = isWorker ? booking.customerName : booking.workerName;
  const otherImage = isWorker ? booking.customerImageUrl : booking.workerImageUrl;
  const isTerminalNonCompleted = booking.status === 'cancelled' || booking.status === 'declined';
  // An unclaimed instant request that was cancelled (or a scheduled
  // request that expired unanswered) has no worker and never will -
  // isInstantWaiting below already stops being true once the status turns
  // terminal, so without this otherName would just render blank.
  const neverMatched = !otherName && NO_WORKER_TERMINAL_STATUSES.includes(booking.status);
  const headerName = neverMatched ? 'No worker found' : otherName;

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

  async function handleReportProblem(reason) {
    setActionError('');
    setDisputeBusy(true);
    try {
      await bookingsApi.createDispute(id, reason);
      setDisputeFiled(true);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDisputeBusy(false);
    }
  }

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>

      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {isInstantWaiting ? booking.services.map((s) => s.name).join(', ') : headerName}
          </p>
          <p className="truncate text-sm text-text-muted">
            {isInstantWaiting ? 'Instant request' : booking.services.map((s) => s.name).join(', ')}
          </p>
        </div>
        {!isInstantWaiting &&
          (neverMatched ? (
            <NoWorkerAvatar size={56} />
          ) : (
            <Avatar name={otherName} imageUrl={otherImage} size={56} />
          ))}
        <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
      </div>

      {booking.scheduledFor && (
        <Card className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Scheduled for</span>
            <span className="font-medium">
              {new Date(booking.scheduledFor).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          {booking.status === 'requested' && booking.respondBy && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-text-muted">Respond by</span>
              <span className="font-medium">
                {new Date(booking.respondBy).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </Card>
      )}

      {isInstantWaiting ? (
        <WaitingForWorker />
      ) : isTerminalNonCompleted ? (
        <Card className="mt-6">
          <p className="font-semibold">{BOOKING_STATUS_LABEL[booking.status]}</p>
          {booking.cancelReason && <p className="mt-1 text-sm text-text-muted">{booking.cancelReason}</p>}
        </Card>
      ) : (
        <StatusTracker status={booking.status} />
      )}

      <Card className="mt-6">
        {!isWorker && booking.workerPhone && (
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3 text-sm">
            <span className="shrink-0 text-text-muted">Worker's phone</span>
            <a href={`tel:${booking.workerPhone}`} className="text-right font-medium text-brand-solid">
              {booking.workerPhone}
            </a>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 pt-3 text-sm first:pt-0">
          <span className="shrink-0 text-text-muted">Address</span>
          <span className="text-right font-medium">{booking.addressLabel}</span>
        </div>
        {booking.services.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
            {booking.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{service.name}</span>
                <span className="font-medium">{service.price !== null ? `Rs. ${service.price}` : 'Pending'}</span>
              </div>
            ))}
          </div>
        )}
        {booking.price !== null && (
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-text-muted">Total</span>
            <span className="font-semibold">Rs. {booking.price}</span>
          </div>
        )}
        {booking.status === 'completed' && (
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-text-muted">Payment method</span>
            <span className="font-medium">
              {booking.paymentMethod === 'cash' ? 'Paid in cash' : 'Paid via eSewa'}
            </span>
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
        {!isInstantWaiting && (
          <Button variant="secondary" onClick={() => navigate(`/booking/${id}/chat`)}>
            Chat
          </Button>
        )}

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
          <CompleteSection
            busy={busy}
            defaultPrice={booking.price}
            onComplete={(finalPrice) =>
              runAction(() => bookingsApi.complete(id, { finalPrice, paymentMethod: 'cash' }))
            }
          />
        )}
        {!isWorker && ['requested', 'accepted'].includes(booking.status) && (
          <CancelSection busy={busy} onCancel={(reason) => runAction(() => bookingsApi.cancel(id, reason))} />
        )}
        {!isWorker && booking.status === 'completed' && !review && (
          <Button onClick={() => setReviewOpen(true)}>Leave a review</Button>
        )}
        {!isInstantWaiting && (
          <ReportProblemSection busy={disputeBusy} filed={disputeFiled} onSubmit={handleReportProblem} />
        )}
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} onSubmit={handleReviewSubmit} />
    </Screen>
  );
}
