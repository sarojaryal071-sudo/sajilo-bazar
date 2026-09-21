import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { open: 'warning', in_progress: 'warning', resolved: 'success', closed: 'neutral' };
const PRIORITY_TONE = { low: 'neutral', normal: 'neutral', high: 'danger' };

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminSupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  function load() {
    adminApi
      .getSupportTicketDetail(id)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleReply(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.replyToTicket(id, reply.trim());
      setReply('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setSavingStatus(true);
    setError('');
    try {
      await adminApi.setTicketStatus(id, newStatus);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
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

  const { ticket, messages, booking } = detail;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-text-muted">
            {ticket.userName} &middot; opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
          <select
            value={ticket.status}
            disabled={savingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {booking && (
        <Card className="mt-6">
          <p className="font-semibold">Linked booking</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Booking</span>
              <span>#{booking.id} &middot; {booking.customerName} &rarr; {booking.workerName || 'unassigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <span className="capitalize">{booking.status}</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Messages</p>
        <div className="mt-3 flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <p className="text-xs text-text-muted">{m.senderName} &middot; {formatDateTime(m.createdAt)}</p>
              <p className="mt-0.5">{m.message}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleReply} className="mt-4 flex flex-col gap-2">
          <textarea
            required
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply..."
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
          />
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? 'Sending...' : 'Send reply'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
