import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge.jsx';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/bookingStatus.js';
import * as adminApi from '../../api/admin.api.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    adminApi
      .listBookings({
        status: status || undefined,
        type: type || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      })
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message));
  }, [status, type, from, to]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Bookings</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All statuses</option>
          {Object.entries(BOOKING_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All types</option>
          <option value="manual">Manual</option>
          <option value="instant">Instant</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!bookings && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {bookings?.length === 0 && <p className="mt-4 text-sm text-text-muted">No bookings match these filters.</p>}

      {bookings?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Service(s)</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => navigate(`/admin/bookings/${b.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                >
                  <td className="px-4 py-3 font-medium text-brand-solid">
                    {formatDate(b.createdAt)}
                    {b.flagged && <Badge tone="danger" className="ml-2">Flagged</Badge>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{b.customerName}</td>
                  <td className="px-4 py-3 text-text-muted">{b.workerName || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{b.serviceNames}</td>
                  <td className="px-4 py-3 capitalize text-text-muted">{b.type}</td>
                  <td className="px-4 py-3">
                    <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{b.price !== null ? `Rs. ${b.price}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
