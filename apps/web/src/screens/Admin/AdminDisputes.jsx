import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { DEPARTMENT_LABEL, DEPARTMENT_TONE } from '../../lib/adminDepartments.js';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { open: 'warning', resolved: 'success', dismissed: 'neutral' };
const EMPTY_FORM = { bookingId: '', raisedByUserId: '', reason: '' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  function load() {
    adminApi
      .listDisputes({ status: status || undefined })
      .then(({ disputes }) => setDisputes(disputes))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [status]);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.createDispute({
        bookingId: Number(form.bookingId),
        raisedByUserId: Number(form.raisedByUserId),
        reason: form.reason.trim(),
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
        <h1 className="text-2xl font-bold">Disputes</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            Log a dispute
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        No self-service "raise a dispute" flow exists yet - log one here on behalf of whichever party reported it.
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
            value={form.bookingId}
            onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))}
            placeholder="Booking ID"
            className="w-32 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <input
            required
            type="number"
            value={form.raisedByUserId}
            onChange={(e) => setForm((f) => ({ ...f, raisedByUserId: e.target.value }))}
            placeholder="Raised by (user ID)"
            className="w-40 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <input
            required
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Reason"
            className="flex-1 min-w-[200px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
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

      <div className="mt-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {!disputes && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {disputes?.length === 0 && <p className="mt-4 text-sm text-text-muted">No disputes match these filters.</p>}

      {disputes?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Raised by</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/admin/disputes/${d.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                >
                  <td className="px-4 py-3 font-medium text-brand-solid">#{d.bookingId}</td>
                  <td className="px-4 py-3 text-text-muted">{d.customerName}</td>
                  <td className="px-4 py-3 text-text-muted">{d.workerName || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{d.raisedByName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={DEPARTMENT_TONE[d.department]}>{DEPARTMENT_LABEL[d.department]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
