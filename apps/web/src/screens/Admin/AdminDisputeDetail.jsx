import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { open: 'warning', resolved: 'success', dismissed: 'neutral' };

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

export function AdminDisputeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [atFault, setAtFault] = useState('worker');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    adminApi
      .getDisputeDetail(id)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleResolve(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.resolveDispute(id, {
        status: resolveStatus,
        atFault: resolveStatus === 'resolved' ? atFault : null,
        resolutionNotes: resolutionNotes.trim() || null,
      });
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

  const { dispute, booking, messages } = detail;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispute #{dispute.id}</h1>
          <p className="text-sm text-text-muted">
            Booking #{dispute.bookingId} &middot; {dispute.customerName} &rarr; {dispute.workerName || 'unassigned'}
          </p>
        </div>
        <Badge tone={STATUS_TONE[dispute.status]}>{dispute.status}</Badge>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <Card className="mt-6">
        <p className="font-semibold">Reason</p>
        <p className="mt-2 text-sm text-text-muted">Raised by {dispute.raisedByName} &middot; {formatDateTime(dispute.createdAt)}</p>
        <p className="mt-2 text-sm">{dispute.reason}</p>
      </Card>

      {booking && (
        <Card className="mt-4">
          <p className="font-semibold">Booking</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Service(s)</span>
              <span>{booking.services.map((s) => s.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Price</span>
              <span>{booking.price !== null ? `Rs. ${booking.price}` : 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <span className="capitalize">{booking.status}</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Chat transcript</p>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No messages.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-text-muted">
                  {m.senderId === booking?.customerId ? booking.customerName : booking?.workerName}:
                </span>{' '}
                {m.message}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Resolution</p>
        {dispute.status !== 'open' ? (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p className="text-text-muted">
              Marked {dispute.status} on {formatDateTime(dispute.resolvedAt)}
            </p>
            {dispute.atFault && <p className="text-text-muted">At fault: {dispute.atFault}</p>}
            {dispute.resolutionNotes && <p>{dispute.resolutionNotes}</p>}
          </div>
        ) : (
          <form onSubmit={handleResolve} className="mt-3 flex flex-col gap-3">
            <select
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value)}
              className="w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            >
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            {resolveStatus === 'resolved' && (
              <select
                value={atFault}
                onChange={(e) => setAtFault(e.target.value)}
                className="w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
              >
                <option value="worker">At fault: worker</option>
                <option value="customer">At fault: customer</option>
                <option value="none">At fault: neither</option>
              </select>
            )}
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Resolution notes (optional)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <Button type="submit" disabled={busy} className="self-start">
              {busy ? 'Saving...' : 'Submit decision'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
