import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
];

const RANGES = [
  { key: 'month', label: 'This month' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];

const EXPENSE_STATUS_TONE = { pending: 'warning', paid: 'success' };

function formatRs(n) {
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatCard({ label, value, sublabel }) {
  return (
    <Card>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-text-muted">{sublabel}</p>}
    </Card>
  );
}

// Revenue tab - target-spec Phase 8/9. totalRevenue is GMV (the sum of
// what customers paid across completed bookings, from
// commission_ledger.job_price), shown for context only - it is NOT part
// of the net income figure. netIncome = totalCommission - totalRefunds,
// not "revenue - commission - refunds": in this commission-marketplace
// model, GMV minus commission is money that goes to WORKERS, not the
// platform, so subtracting it would show a materially wrong number here.
// See admin.model.js's getRevenueSummary for the full reasoning.
function RevenueTab() {
  const [searchParams] = useSearchParams();
  const [range, setRange] = useState(() => {
    const fromUrl = searchParams.get('range');
    return RANGES.some((r) => r.key === fromUrl) ? fromUrl : 'month';
  });
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(null);
    adminApi
      .getRevenueSummary(range)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [range]);

  return (
    <div>
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              range === r.key ? 'bg-brand text-text-onBrand' : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!summary && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      {summary && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total revenue" value={formatRs(summary.totalRevenue)} sublabel="Gross booking value (GMV)" />
            <StatCard label="Total commission" value={formatRs(summary.totalCommission)} sublabel="The platform's own cut of GMV" />
            <StatCard label="Total refunds" value={formatRs(summary.totalRefunds)} sublabel="No refund system exists yet" />
            <StatCard label="Net income" value={formatRs(summary.netIncome)} sublabel="Commission minus refunds" />
          </div>
          <p className="mt-3 text-xs text-text-muted">
            {summary.completedJobs} completed job{summary.completedJobs === 1 ? '' : 's'} in this range. Total revenue (GMV) is
            shown for context - most of it is paid out to workers, not kept by the platform, so it is not part of net income.
          </p>
        </>
      )}
    </div>
  );
}

const EMPTY_EXPENSE_FORM = {
  vendor: '',
  category: '',
  amount: '',
  status: 'pending',
  expenseDate: new Date().toISOString().slice(0, 10),
};

function ExpenseForm({ initial, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY_EXPENSE_FORM);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, amount: Number(form.amount) });
      }}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <input
        required
        value={form.vendor}
        onChange={(e) => setForm({ ...form, vendor: e.target.value })}
        placeholder="Vendor"
        className="w-40 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <input
        required
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        placeholder="Category"
        className="w-36 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <input
        required
        type="number"
        min="0.01"
        step="0.01"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        placeholder="Amount"
        className="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <select
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
        className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      >
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
      </select>
      <input
        required
        type="date"
        value={form.expenseDate}
        onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
        className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ExpenseRow({ expense, editing, busy, onEdit, onCancelEdit, onSave, onPay, onDelete }) {
  if (editing) {
    return (
      <tr className="border-b border-border last:border-0">
        <td colSpan={6} className="p-3">
          <ExpenseForm
            initial={{
              vendor: expense.vendor,
              category: expense.category,
              amount: String(expense.amount),
              status: expense.status,
              expenseDate: expense.expenseDate,
            }}
            busy={busy}
            onSubmit={onSave}
            onCancel={onCancelEdit}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-alt">
      <td className="px-4 py-3 font-medium">{expense.vendor}</td>
      <td className="px-4 py-3 text-text-muted">{expense.category}</td>
      <td className="px-4 py-3">{formatRs(expense.amount)}</td>
      <td className="px-4 py-3">
        <Badge tone={EXPENSE_STATUS_TONE[expense.status]}>{expense.status}</Badge>
      </td>
      <td className="px-4 py-3 text-text-muted">{formatDate(expense.expenseDate)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {expense.status === 'pending' && (
            <Button variant="secondary" disabled={busy} onClick={onPay} className="px-3 py-1.5 text-xs">
              {busy ? 'Working...' : 'Mark paid'}
            </Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={onEdit} className="px-3 py-1.5 text-xs">
            Edit
          </Button>
          <Button variant="danger" disabled={busy} onClick={onDelete} className="px-3 py-1.5 text-xs">
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ExpensesTab() {
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .listExpenses()
      .then(({ expenses }) => setExpenses(expenses))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(input) {
    setSaving(true);
    setError('');
    try {
      await adminApi.createExpense(input);
      setShowNewForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id, input) {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateExpense(id, input);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePay(id) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.payExpense(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    setBusyId(id);
    setError('');
    try {
      await adminApi.deleteExpense(id);
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
        <p className="text-xs text-text-muted">Manual entry - vendor, category, amount, status, date. No recurring automation.</p>
        {!showNewForm && (
          <Button onClick={() => setShowNewForm(true)} className="px-4 py-2 text-sm">
            New expense
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {showNewForm && (
        <div className="mt-3">
          <ExpenseForm busy={saving} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

      {!expenses && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {expenses?.length === 0 && <p className="mt-4 text-sm text-text-muted">No expenses yet.</p>}

      {expenses?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  editing={editingId === expense.id}
                  busy={busyId === expense.id || (saving && editingId === expense.id)}
                  onEdit={() => setEditingId(expense.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(input) => handleUpdate(expense.id, input)}
                  onPay={() => handlePay(expense.id)}
                  onDelete={() => handleDelete(expense.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminFinance() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const fromUrl = searchParams.get('tab');
    return TABS.some((t) => t.key === fromUrl) ? fromUrl : 'revenue';
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Finance</h1>
      <p className="mt-1 text-xs text-text-muted">
        Revenue and manual expense tracking - deliberately lean, not a double-entry ledger.
      </p>

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
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'expenses' && <ExpensesTab />}
      </div>
    </div>
  );
}
