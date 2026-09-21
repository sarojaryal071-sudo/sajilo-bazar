import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { open: 'warning', in_progress: 'warning', resolved: 'success', closed: 'neutral' };
const PRIORITY_TONE = { low: 'neutral', normal: 'neutral', high: 'danger' };
const EMPTY_FORM = { userId: '', bookingId: '', subject: '', priority: 'normal', message: '' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AdminSupportTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  function load() {
    adminApi
      .listSupportTickets({ status: status || undefined, priority: priority || undefined, q: q || undefined })
      .then(({ tickets }) => setTickets(tickets))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [status, priority, q]);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.createSupportTicket({
        userId: Number(form.userId),
        bookingId: form.bookingId ? Number(form.bookingId) : null,
        subject: form.subject.trim(),
        priority: form.priority,
        message: form.message.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support tickets</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            Log a ticket
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        No self-service "contact support" flow exists yet - log one here on behalf of whoever reported it (phone, etc).
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-wrap items-start gap-2 rounded-xl border border-border bg-surface p-3"
        >
          <input
            required
            type="number"
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            placeholder="User ID"
            className="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <input
            type="number"
            value={form.bookingId}
            onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))}
            placeholder="Booking ID (optional)"
            className="w-44 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <input
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Subject"
            className="w-56 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
          <textarea
            required
            rows={2}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="What did they report?"
            className="w-full flex-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
              {busy ? 'Saving...' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm">
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by subject or name"
          className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      {!tickets && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {tickets?.length === 0 && <p className="mt-4 text-sm text-text-muted">No tickets match these filters.</p>}

      {tickets?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/admin/support/${t.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                >
                  <td className="px-4 py-3 font-medium text-brand-solid">{t.subject}</td>
                  <td className="px-4 py-3 text-text-muted">{t.userName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
