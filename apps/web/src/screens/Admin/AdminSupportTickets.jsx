import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ADMIN_DEPARTMENTS, DEPARTMENT_LABEL, DEPARTMENT_TONE } from '../../lib/adminDepartments.js';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { open: 'warning', in_progress: 'warning', resolved: 'success', closed: 'neutral' };
const PRIORITY_TONE = { low: 'neutral', normal: 'neutral', high: 'danger' };
const EMPTY_FORM = { userId: '', bookingId: '', subject: '', priority: 'normal', message: '' };

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 20 18-8L3 4v6l12 2-12 2v6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewTicketForm({ form, setForm, busy, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-b border-border bg-surface-alt p-3">
      <div className="flex flex-wrap gap-2">
        <input
          required
          type="number"
          value={form.userId}
          onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          placeholder="User ID"
          className="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
        <input
          type="number"
          value={form.bookingId}
          onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))}
          placeholder="Booking ID (optional)"
          className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <input
        required
        value={form.subject}
        onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        placeholder="Subject"
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <textarea
        required
        rows={2}
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        placeholder="What did they report?"
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Saving...' : 'Create'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Conversation list, Messenger-style: each row is one support ticket,
// identified by the actual person (avatar + full name) rather than just
// the subject line, with the opening/latest message as a preview.
function TicketRow({ ticket, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-surface-alt ${
        active ? 'bg-surface-alt' : ''
      }`}
    >
      <Avatar name={ticket.userName} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{ticket.userName}</p>
          <span className="shrink-0 text-[11px] text-text-muted">{formatDate(ticket.updatedAt)}</span>
        </div>
        <p className="truncate text-xs text-text-muted">{ticket.subject}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Badge tone={DEPARTMENT_TONE[ticket.department]} className="!px-2 !py-0.5 !text-[10px]">
            {DEPARTMENT_LABEL[ticket.department]}
          </Badge>
          <Badge tone={STATUS_TONE[ticket.status]} className="!px-2 !py-0.5 !text-[10px]">
            {ticket.status.replace('_', ' ')}
          </Badge>
          {ticket.priority === 'high' && (
            <Badge tone="danger" className="!px-2 !py-0.5 !text-[10px]">
              high
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// Messenger-style detail pane: header (who this is, their ticket status),
// scrollable message thread (admin's own replies bubble right like any
// other chat in this app - see BookingChat.jsx - the ticket owner's
// messages bubble left), composer at the bottom. No attachment support -
// support_ticket_messages has no attachment columns, unlike booking chat.
function ChatPanel({ detail, adminId, onReply, onStatusChange, onEscalate, sending, savingStatus, escalating }) {
  const [reply, setReply] = useState('');
  const [escalateTo, setEscalateTo] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [detail?.messages.length]);

  const { ticket, messages, booking, escalations } = detail;

  function handleSubmit(e) {
    e.preventDefault();
    const text = reply.trim();
    if (!text) return;
    onReply(text);
    setReply('');
  }

  function handleEscalate(e) {
    e.preventDefault();
    if (!escalateTo) return;
    onEscalate(escalateTo);
    setEscalateTo('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={ticket.userName} size={40} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{ticket.userName}</p>
            <p className="truncate text-xs text-text-muted">
              {ticket.subject} &middot; opened {formatDate(ticket.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={DEPARTMENT_TONE[ticket.department]}>{DEPARTMENT_LABEL[ticket.department]}</Badge>
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
          <select
            value={ticket.status}
            disabled={savingStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {booking && (
        <div className="shrink-0 border-b border-border bg-surface-alt px-4 py-2 text-xs text-text-muted">
          Linked booking #{booking.id} &middot; {booking.customerName} &rarr; {booking.workerName || 'unassigned'}
          &middot; <span className="capitalize">{booking.status}</span>
        </div>
      )}

      <form onSubmit={handleEscalate} className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        <select
          value={escalateTo}
          onChange={(e) => setEscalateTo(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-solid"
        >
          <option value="">Escalate to...</option>
          {ADMIN_DEPARTMENTS.filter((d) => d !== ticket.department).map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABEL[d]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" disabled={!escalateTo || escalating} className="px-3 py-1.5 text-xs">
          {escalating ? 'Escalating...' : 'Escalate'}
        </Button>
        {escalations?.length > 0 && (
          <span className="text-[11px] text-text-muted">
            Last: {formatDateTime(escalations[escalations.length - 1].createdAt)} &middot;{' '}
            {escalations[escalations.length - 1].escalatedByName} moved this to{' '}
            {DEPARTMENT_LABEL[escalations[escalations.length - 1].toDepartment]}
          </span>
        )}
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const isMine = m.senderId === adminId;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {!isMine && <span className="mb-0.5 px-1 text-[11px] text-text-muted">{m.senderName}</span>}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? 'bg-brand text-text-onBrand' : 'bg-surface-raised text-text shadow-resting'
                  }`}
                >
                  {m.message}
                </div>
                <span className="mt-1 px-1 text-[11px] text-text-muted">{formatTime(m.createdAt)}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            required
            rows={1}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Reply..."
            className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-surface-alt px-4 py-2.5 text-sm outline-none focus:border-brand-solid"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            aria-label="Send reply"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminSupportTickets() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();

  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [escalating, setEscalating] = useState(false);

  function loadList() {
    adminApi
      .listSupportTickets({ status: status || undefined, priority: priority || undefined, q: q || undefined })
      .then(({ tickets }) => setTickets(tickets))
      .catch((err) => setError(err.message));
  }

  useEffect(loadList, [status, priority, q]);

  function loadDetail(ticketId) {
    setDetailError('');
    adminApi
      .getSupportTicketDetail(ticketId)
      .then(setDetail)
      .catch((err) => setDetailError(err.message));
  }

  useEffect(() => {
    if (id) loadDetail(id);
    else setDetail(null);
  }, [id]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { ticket } = await adminApi.createSupportTicket({
        userId: Number(form.userId),
        bookingId: form.bookingId ? Number(form.bookingId) : null,
        subject: form.subject.trim(),
        priority: form.priority,
        message: form.message.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadList();
      navigate(`/admin/support/${ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(text) {
    setSending(true);
    setDetailError('');
    try {
      await adminApi.replyToTicket(id, text);
      loadDetail(id);
      loadList();
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setSavingStatus(true);
    setDetailError('');
    try {
      await adminApi.setTicketStatus(id, newStatus);
      loadDetail(id);
      loadList();
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleEscalate(department) {
    setEscalating(true);
    setDetailError('');
    try {
      await adminApi.escalateTicket(id, department);
      loadDetail(id);
      loadList();
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setEscalating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-bold">Support tickets</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            Log a ticket
          </Button>
        )}
      </div>

      {error && <p className="mt-2 shrink-0 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-resting">
        <div className="flex w-80 shrink-0 flex-col border-r border-border">
          {showForm && (
            <NewTicketForm
              form={form}
              setForm={setForm}
              busy={creating}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by subject or name"
              className="w-full rounded-md border border-border bg-surface-alt px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            />
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface-alt px-2 py-1.5 text-xs outline-none focus:border-brand-solid"
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
                className="flex-1 rounded-md border border-border bg-surface-alt px-2 py-1.5 text-xs outline-none focus:border-brand-solid"
              >
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!tickets && !error && <p className="p-4 text-sm text-text-muted">Loading...</p>}
            {tickets?.length === 0 && <p className="p-4 text-sm text-text-muted">No tickets match these filters.</p>}
            {tickets?.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                active={String(t.id) === id}
                onClick={() => navigate(`/admin/support/${t.id}`)}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {!id && (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-muted">
              Select a conversation to view it here.
            </div>
          )}
          {id && detailError && <p className="p-4 text-sm text-danger">{detailError}</p>}
          {id && !detail && !detailError && <p className="p-4 text-sm text-text-muted">Loading...</p>}
          {id && detail && (
            <ChatPanel
              detail={detail}
              adminId={adminUser.id}
              onReply={handleReply}
              onStatusChange={handleStatusChange}
              onEscalate={handleEscalate}
              sending={sending}
              savingStatus={savingStatus}
              escalating={escalating}
            />
          )}
        </div>
      </div>
    </div>
  );
}
