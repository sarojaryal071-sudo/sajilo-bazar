import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { ADMIN_DEPARTMENTS, DEPARTMENT_LABEL } from '../../lib/adminDepartments.js';
import * as adminApi from '../../api/admin.api.js';

const EMPTY_FORM = { fullName: '', phone: '', email: '', password: '', departments: [], isSuperAdmin: false };

// Round E (2026-09-27) - Super Admin creates staff accounts and assigns
// their department grants here. A Super Admin bypasses department gating
// entirely, so the checkboxes below are moot (and disabled) once that
// toggle is on - matches how the server itself decides access.
function DepartmentCheckboxes({ selected, isSuperAdmin, onToggle }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ADMIN_DEPARTMENTS.map((dept) => (
        <label
          key={dept}
          className={`flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm ${
            isSuperAdmin ? 'opacity-50' : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            disabled={isSuperAdmin}
            checked={selected.includes(dept)}
            onChange={() => onToggle(dept)}
          />
          {DEPARTMENT_LABEL[dept]}
        </label>
      ))}
    </div>
  );
}

function StaffCreateForm({ busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);

  function toggleDepartment(dept) {
    setForm((f) => ({
      ...f,
      departments: f.departments.includes(dept)
        ? f.departments.filter((d) => d !== dept)
        : [...f.departments, dept],
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          password: form.password,
          departments: form.departments,
          isSuperAdmin: form.isSuperAdmin,
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input
          required
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          placeholder="Full name"
          className="flex-1 min-w-[180px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
        <input
          required
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Phone"
          className="w-40 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email (optional)"
          className="flex-1 min-w-[180px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
        <input
          required
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="Password (min 8 chars)"
          className="w-52 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.isSuperAdmin}
          onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
        />
        Super Admin (bypasses department gating entirely)
      </label>
      <DepartmentCheckboxes
        selected={form.departments}
        isSuperAdmin={form.isSuperAdmin}
        onToggle={toggleDepartment}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Creating...' : 'Create staff account'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function StaffRow({ staff, busy, onChange }) {
  const [departments, setDepartments] = useState(staff.departments);
  const [isSuperAdmin, setIsSuperAdmin] = useState(staff.isSuperAdmin);
  const dirty = isSuperAdmin !== staff.isSuperAdmin || departments.join() !== staff.departments.join();

  function toggleDepartment(dept) {
    setDepartments((prev) => (prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]));
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{staff.fullName}</p>
          <p className="text-xs text-text-muted">
            {staff.clientId} &middot; {staff.phone}
            {staff.email && <> &middot; {staff.email}</>}
          </p>
        </div>
        {staff.isSuperAdmin && <Badge tone="success">Super Admin</Badge>}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isSuperAdmin}
          onChange={(e) => setIsSuperAdmin(e.target.checked)}
        />
        Super Admin
      </label>
      <div className="mt-2">
        <DepartmentCheckboxes selected={departments} isSuperAdmin={isSuperAdmin} onToggle={toggleDepartment} />
      </div>

      {dirty && (
        <Button
          disabled={busy}
          onClick={() => onChange(staff.id, { departments, isSuperAdmin })}
          className="mt-3 px-4 py-1.5 text-sm"
        >
          {busy ? 'Saving...' : 'Save access changes'}
        </Button>
      )}
    </Card>
  );
}

function StaffTab() {
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .listStaff()
      .then(({ staff }) => setStaff(staff))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(input) {
    setBusyId('new');
    setError('');
    try {
      await adminApi.createStaff(input);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccessChange(id, input) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.updateStaffAccess(id, input);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            New staff account
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Create staff accounts and grant department access - Analytics and Settings stay Super Admin-only,
        not one of the assignable departments.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mt-4">
          <StaffCreateForm busy={busyId === 'new'} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {!staff && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      <div className="mt-4 flex flex-col gap-3">
        {staff?.map((s) => (
          <StaffRow key={s.id} staff={s} busy={busyId === s.id} onChange={handleAccessChange} />
        ))}
      </div>
    </div>
  );
}

const LENS_OPTIONS = [
  { value: '', label: 'All lenses' },
  { value: 'security', label: 'Security' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
];

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

const SEVERITY_TONE = { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' };

const ACTION_LABEL = {
  'auth.login_success': 'Login succeeded',
  'auth.login_failed': 'Login failed',
  'auth.password_reset': 'Password reset',
  'staff.created': 'Staff account created',
  'staff.access_updated': 'Staff access changed',
  'user.suspended': 'User suspended',
  'user.reinstated': 'User reinstated',
  'verification.document_approved': 'Verification document approved',
  'verification.document_rejected': 'Verification document rejected',
  'worker_service.approved': 'Worker service approved',
  'worker_service.rejected': 'Worker service rejected',
  'dispute.resolved': 'Dispute resolved',
  'dispute.escalated': 'Dispute escalated',
  'service.updated': 'Service updated',
  'platform_setting.updated': 'Platform setting changed',
};

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditLogRow({ entry, expanded, onToggle }) {
  const hasDiff = entry.oldValue || entry.newValue;
  return (
    <>
      <tr
        className={`border-t border-border text-sm ${hasDiff ? 'cursor-pointer hover:bg-surface-alt' : ''}`}
        onClick={() => hasDiff && onToggle(entry.id)}
      >
        <td className="whitespace-nowrap px-3 py-2 text-text-muted">{formatTimestamp(entry.createdAt)}</td>
        <td className="px-3 py-2">{entry.actorName || (entry.actorId ? `User #${entry.actorId}` : 'Unknown')}</td>
        <td className="px-3 py-2">{ACTION_LABEL[entry.action] || entry.action}</td>
        <td className="px-3 py-2">
          <Badge tone={SEVERITY_TONE[entry.severity]}>{entry.severity}</Badge>
        </td>
        <td className="px-3 py-2 text-text-muted">
          {entry.targetType ? `${entry.targetType}${entry.targetId ? ` #${entry.targetId}` : ''}` : '-'}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr className="border-t border-border bg-surface-alt text-xs">
          <td colSpan={5} className="px-3 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 font-semibold text-text-muted">Before</p>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-surface p-2">
                  {entry.oldValue ? JSON.stringify(entry.oldValue, null, 2) : '-'}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-semibold text-text-muted">After</p>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-surface p-2">
                  {entry.newValue ? JSON.stringify(entry.newValue, null, 2) : '-'}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Target spec Phase 2 - a browsable/filterable record, not a monitoring
// system: no alerting, no anomaly detection, just the list. Actor
// filtering is a client-side name match over the already-fetched page
// rather than a second "look up a staff member's numeric id" step - the
// backend filter itself only takes lens/severity/date range.
function AuditLogTab() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [lens, setLens] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorQuery, setActorQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    adminApi
      .getAuditLog({
        lens: lens || undefined,
        severity: severity || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      })
      .then(({ entries }) => setEntries(entries))
      .catch((err) => setError(err.message));
  }, [lens, severity, from, to]);

  const visible = entries?.filter(
    (e) => !actorQuery.trim() || (e.actorName || '').toLowerCase().includes(actorQuery.trim().toLowerCase())
  );

  return (
    <div>
      <p className="text-xs text-text-muted">
        A record of sensitive admin/staff actions - logins, access changes, moderation decisions, pricing
        changes. Click a row with a diff to see before/after values.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={lens}
          onChange={(e) => setLens(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          {LENS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All severities</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        <span className="text-xs text-text-muted">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        <input
          value={actorQuery}
          onChange={(e) => setActorQuery(e.target.value)}
          placeholder="Filter by actor name"
          className="w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!entries && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      {entries && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-surface-alt text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-text-muted">
                    No matching audit log entries.
                  </td>
                </tr>
              )}
              {visible.map((entry) => (
                <AuditLogRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'staff', label: 'Staff' },
  { key: 'audit', label: 'Audit Log' },
];

export function AdminStaff() {
  const [tab, setTab] = useState('staff');

  return (
    <div>
      <h1 className="text-2xl font-bold">Staff</h1>

      <div className="mt-4 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'border-b-2 border-brand-solid text-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'staff' && <StaffTab />}
        {tab === 'audit' && <AuditLogTab />}
      </div>
    </div>
  );
}
