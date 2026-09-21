import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/Badge.jsx';
import * as adminApi from '../../api/admin.api.js';

const MODERATION_TONE = { active: 'success', suspended: 'danger' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      adminApi
        .listUsers({ role: role || undefined, status: status || undefined, q: q || undefined })
        .then(({ users }) => setUsers(users))
        .catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(timeout);
  }, [role, status, q]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone"
          className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="worker">Worker</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!users && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {users?.length === 0 && <p className="mt-4 text-sm text-text-muted">No users match these filters.</p>}

      {users?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${user.id}`} className="font-medium text-brand-solid hover:underline">
                      {user.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{user.phone}</td>
                  <td className="px-4 py-3 capitalize">{user.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={MODERATION_TONE[user.moderationStatus]}>{user.moderationStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
