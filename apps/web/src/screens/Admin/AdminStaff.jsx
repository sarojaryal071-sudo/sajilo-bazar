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

export function AdminStaff() {
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
        <h1 className="text-2xl font-bold">Staff</h1>
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
