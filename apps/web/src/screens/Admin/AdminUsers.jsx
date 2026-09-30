import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge.jsx';
import * as adminApi from '../../api/admin.api.js';

const MODERATION_TONE = { active: 'success', suspended: 'danger' };
const TIER_LABEL = { top_performer: 'Top performer', standard: 'Standard', below_threshold: 'Below threshold' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// sort/flagged/tier (target-spec Phase 7 "Plumbing") - what the Dashboard
// rework's Rating distribution / Flagged rate / Performance tier split /
// Earnings concentration cards link into. Initial state reads straight off
// the URL so a dashboard card's link (e.g. /admin/users?role=worker&sort=
// rating) lands pre-filtered; the filter controls below then behave like
// every other admin list screen's (plain local state, refetch on change).
export function AdminUsers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState(() => searchParams.get('role') || '');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(() => searchParams.get('sort') || '');
  const [flagged, setFlagged] = useState(() => searchParams.get('flagged') === 'true');
  const [tier, setTier] = useState(() => searchParams.get('tier') || '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      adminApi
        .listUsers({
          role: role || undefined,
          status: status || undefined,
          q: q || undefined,
          sort: sort || undefined,
          flagged: flagged || undefined,
          tier: tier || undefined,
        })
        .then(({ users }) => setUsers(users))
        .catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(timeout);
  }, [role, status, q, sort, flagged, tier]);

  const showRating = sort === 'rating';
  const showEarnings = sort === 'earnings';
  const showTier = Boolean(tier);

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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">Sort: newest</option>
          <option value="rating">Sort: rating</option>
          <option value="earnings">Sort: earnings</option>
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All tiers</option>
          <option value="top_performer">Top performer</option>
          <option value="standard">Standard</option>
          <option value="below_threshold">Below threshold</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
          Flagged only
        </label>
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
                {showRating && <th className="px-4 py-3 font-medium">Rating</th>}
                {showEarnings && <th className="px-4 py-3 font-medium">Earnings</th>}
                {showTier && <th className="px-4 py-3 font-medium">Tier</th>}
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                >
                  <td className="px-4 py-3 font-medium text-brand-solid">{user.fullName}</td>
                  <td className="px-4 py-3 text-text-muted">{user.phone}</td>
                  <td className="px-4 py-3 capitalize">{user.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={MODERATION_TONE[user.moderationStatus]}>{user.moderationStatus}</Badge>
                  </td>
                  {showRating && (
                    <td className="px-4 py-3 text-text-muted">{user.ratingAvg != null ? `${user.ratingAvg.toFixed(1)} ★` : '—'}</td>
                  )}
                  {showEarnings && (
                    <td className="px-4 py-3 text-text-muted">
                      {user.totalEarnings != null ? `Rs. ${Math.round(user.totalEarnings)}` : '—'}
                    </td>
                  )}
                  {showTier && <td className="px-4 py-3 text-text-muted">{TIER_LABEL[tier]}</td>}
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
