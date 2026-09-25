import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { draft: 'neutral', published: 'success', unpublished: 'neutral' };
const TYPE_LABEL = { notification: 'Notification', promotion: 'Promotion' };
const EMPTY_FORM = {
  type: 'notification',
  title: '',
  body: '',
  imageUrl: '',
  ctaLabel: '',
  ctaLink: '',
  audience: 'all',
  scheduledAt: '',
  expiresAt: '',
};

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// <input type="datetime-local"> works in local wall-clock values with no
// timezone/seconds; the API wants a full ISO instant.
function toIsoOrNull(localValue) {
  return localValue ? new Date(localValue).toISOString() : null;
}

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// One form for both publication types (2026-09-25 decision) - the Type
// selector at the top drives which fields matter. image/CTA are shown
// only for Promotion (progressive disclosure), since they're meaningless
// for a Notification, but nothing here is type-locked after creation:
// changing the dropdown on an existing draft just shows/hides fields.
function PublicationForm({ initial, submitLabel, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const isPromotion = form.type === 'promotion';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          type: form.type,
          title: form.title.trim(),
          body: form.body.trim(),
          imageUrl: isPromotion && form.imageUrl.trim() ? form.imageUrl.trim() : null,
          ctaLabel: isPromotion && form.ctaLabel.trim() ? form.ctaLabel.trim() : null,
          ctaLink: isPromotion && form.ctaLink.trim() ? form.ctaLink.trim() : null,
          audience: form.audience,
          scheduledAt: toIsoOrNull(form.scheduledAt),
          expiresAt: toIsoOrNull(form.expiresAt),
        });
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <label className="flex items-center gap-2 text-sm text-text-muted">
        Type
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        >
          <option value="notification">Notification</option>
          <option value="promotion">Promotion</option>
        </select>
      </label>
      <p className="text-xs text-text-muted">
        {isPromotion
          ? 'Renders only as a Home/Dashboard carousel card - never sent as a notification.'
          : 'Fans out to the bell badge + Alerts feed for every matching user - never shown on Home/Dashboard.'}
      </p>
      <input
        required
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="Title"
        className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      <textarea
        required
        rows={3}
        value={form.body}
        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        placeholder="Body"
        className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
      />
      {isPromotion && (
        <>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="Image URL (optional)"
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
          <div className="flex gap-2">
            <input
              value={form.ctaLabel}
              onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
              placeholder="CTA label (optional)"
              className="flex-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            />
            <input
              value={form.ctaLink}
              onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))}
              placeholder="CTA link (optional)"
              className="flex-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            />
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={form.audience}
          onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
          className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
        >
          <option value="all">All</option>
          <option value="customers">Customers</option>
          <option value="workers">Workers</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Scheduled
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Expires
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="px-4 py-1.5 text-sm">
          {busy ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-4 py-1.5 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AdminPublications() {
  const [publications, setPublications] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .listPublications({ type: type || undefined, status: status || undefined })
      .then(({ publications }) => setPublications(publications))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [type, status]);

  async function handleCreate(input) {
    setBusyId('new');
    setError('');
    try {
      await adminApi.createPublication(input);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdate(id, input) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.updatePublication(id, input);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePublish(p) {
    setBusyId(p.id);
    setError('');
    try {
      if (p.status === 'published') {
        await adminApi.unpublishPublication(p.id);
      } else {
        await adminApi.publishPublication(p.id);
      }
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
        <h1 className="text-2xl font-bold">Publications</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            New publication
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mt-4">
          <PublicationForm
            initial={EMPTY_FORM}
            submitLabel="Create"
            busy={busyId === 'new'}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All types</option>
          <option value="notification">Notification</option>
          <option value="promotion">Promotion</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
      </div>

      {!publications && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {publications?.length === 0 && <p className="mt-4 text-sm text-text-muted">No publications match these filters.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {publications?.map((p) =>
          editingId === p.id ? (
            <PublicationForm
              key={p.id}
              initial={{
                type: p.type,
                title: p.title,
                body: p.body,
                imageUrl: p.imageUrl ?? '',
                ctaLabel: p.ctaLabel ?? '',
                ctaLink: p.ctaLink ?? '',
                audience: p.audience,
                scheduledAt: toLocalInputValue(p.scheduledAt),
                expiresAt: toLocalInputValue(p.expiresAt),
              }}
              submitLabel="Save"
              busy={busyId === p.id}
              onSubmit={(input) => handleUpdate(p.id, input)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{TYPE_LABEL[p.type]}</Badge>
                    <p className="font-semibold">{p.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{p.body}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Audience: <span className="capitalize">{p.audience}</span>
                    {p.scheduledAt && <> &middot; Scheduled {formatDateTime(p.scheduledAt)}</>}
                    {p.expiresAt && <> &middot; Expires {formatDateTime(p.expiresAt)}</>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    {p.isLive && <Badge tone="success">Live now</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === p.id}
                      onClick={() => setEditingId(p.id)}
                      className="px-3 py-1.5 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === p.id}
                      onClick={() => handleTogglePublish(p)}
                      className="px-3 py-1.5 text-xs"
                    >
                      {busyId === p.id ? 'Working...' : p.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
