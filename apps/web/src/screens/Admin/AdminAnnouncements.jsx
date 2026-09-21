import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { draft: 'neutral', published: 'success', unpublished: 'neutral' };
const EMPTY_FORM = { title: '', body: '', audience: 'all', scheduledAt: '', expiresAt: '' };

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

function AnnouncementForm({ initial, submitLabel, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          scheduledAt: toIsoOrNull(form.scheduledAt),
          expiresAt: toIsoOrNull(form.expiresAt),
        });
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
    >
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

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    adminApi
      .listAnnouncements({ status: status || undefined })
      .then(({ announcements }) => setAnnouncements(announcements))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [status]);

  async function handleCreate(input) {
    setBusyId('new');
    setError('');
    try {
      await adminApi.createAnnouncement(input);
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
      await adminApi.updateAnnouncement(id, input);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePublish(a) {
    setBusyId(a.id);
    setError('');
    try {
      if (a.status === 'published') {
        await adminApi.unpublishAnnouncement(a.id);
      } else {
        await adminApi.publishAnnouncement(a.id);
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
        <h1 className="text-2xl font-bold">Announcements</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm">
            New announcement
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <div className="mt-4">
          <AnnouncementForm
            initial={EMPTY_FORM}
            submitLabel="Create"
            busy={busyId === 'new'}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-4">
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

      {!announcements && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {announcements?.length === 0 && <p className="mt-4 text-sm text-text-muted">No announcements match these filters.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {announcements?.map((a) =>
          editingId === a.id ? (
            <AnnouncementForm
              key={a.id}
              initial={{
                title: a.title,
                body: a.body,
                audience: a.audience,
                scheduledAt: toLocalInputValue(a.scheduledAt),
                expiresAt: toLocalInputValue(a.expiresAt),
              }}
              submitLabel="Save"
              busy={busyId === a.id}
              onSubmit={(input) => handleUpdate(a.id, input)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{a.body}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Audience: <span className="capitalize">{a.audience}</span>
                    {a.scheduledAt && <> &middot; Scheduled {formatDateTime(a.scheduledAt)}</>}
                    {a.expiresAt && <> &middot; Expires {formatDateTime(a.expiresAt)}</>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                    {a.isLive && <Badge tone="success">Live now</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === a.id}
                      onClick={() => setEditingId(a.id)}
                      className="px-3 py-1.5 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === a.id}
                      onClick={() => handleTogglePublish(a)}
                      className="px-3 py-1.5 text-xs"
                    >
                      {busyId === a.id ? 'Working...' : a.status === 'published' ? 'Unpublish' : 'Publish'}
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
