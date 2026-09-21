import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/bookingStatus.js';
import * as adminApi from '../../api/admin.api.js';

const CANCELLABLE_STATUSES = ['requested', 'accepted', 'in_progress'];

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    adminApi
      .getBookingDetail(id)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleCancel(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.cancelBooking(id, cancelReason.trim());
      setShowCancelForm(false);
      setCancelReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFlag(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.setBookingFlag(id, { flagged: true, reason: flagReason.trim() || null });
      setShowFlagForm(false);
      setFlagReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnflag() {
    setBusy(true);
    setError('');
    try {
      await adminApi.setBookingFlag(id, { flagged: false, reason: null });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>
        <p className="mt-4 text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!detail) return <p className="text-sm text-text-muted">Loading...</p>;

  const { booking, messages, commissionEntry } = detail;
  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Booking #{booking.id}</h1>
          <p className="text-sm text-text-muted">
            {booking.customerName} &rarr; {booking.workerName || 'unassigned'} &middot;{' '}
            <span className="capitalize">{booking.type}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {booking.flagged && <Badge tone="danger">Flagged</Badge>}
          <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <Card className="mt-6">
        <p className="font-semibold">Services</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {booking.services.map((s) => (
            <div key={s.id} className="flex justify-between">
              <span className="text-text-muted">{s.name}</span>
              <span>{s.price !== null ? `Rs. ${s.price}` : 'Pending'}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span>{booking.price !== null ? `Rs. ${booking.price}` : 'Pending'}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-text-muted">{booking.addressLabel}</p>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Timeline</p>
        <p className="mt-1 text-xs text-text-muted">
          Only what's actually recorded on the booking - there's no separate log of every status
          transition (e.g. exact accept/start times).
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Requested</span>
            <span>{formatDateTime(booking.createdAt)}</span>
          </div>
          {booking.completedAt && (
            <div className="flex justify-between">
              <span className="text-text-muted">Completed</span>
              <span>{formatDateTime(booking.completedAt)}</span>
            </div>
          )}
          {booking.status === 'cancelled' && (
            <div className="flex justify-between">
              <span className="text-text-muted">Cancel reason</span>
              <span>{booking.cancelReason || '—'}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Commission entry</p>
        {commissionEntry ? (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Job price</span>
              <span>Rs. {commissionEntry.jobPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Commission</span>
              <span>Rs. {commissionEntry.commissionAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Worker balance after</span>
              <span>Rs. {commissionEntry.creditBalanceAfter}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No commission entry - this booking hasn't completed.</p>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Chat transcript</p>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No messages.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-text-muted">
                  {m.senderId === booking.customerId ? booking.customerName : booking.workerName}:
                </span>{' '}
                {m.message}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Moderation</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {canCancel && (
            <Button variant="secondary" disabled={busy} onClick={() => setShowCancelForm((v) => !v)}>
              Cancel booking
            </Button>
          )}
          {booking.flagged ? (
            <Button variant="secondary" disabled={busy} onClick={handleUnflag}>
              Unflag
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => setShowFlagForm((v) => !v)}>
              Flag for review
            </Button>
          )}
        </div>

        {showCancelForm && (
          <form onSubmit={handleCancel} className="mt-3 flex flex-col gap-2">
            <input
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancelling"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <Button type="submit" disabled={busy} className="self-start">
              {busy ? 'Cancelling...' : 'Confirm cancel'}
            </Button>
          </form>
        )}

        {showFlagForm && (
          <form onSubmit={handleFlag} className="mt-3 flex flex-col gap-2">
            <input
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason (optional)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <Button type="submit" disabled={busy} className="self-start">
              {busy ? 'Flagging...' : 'Confirm flag'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
