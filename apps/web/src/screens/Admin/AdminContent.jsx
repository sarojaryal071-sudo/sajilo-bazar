import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { PublicationStatusBadges } from '../../components/PublicationStatusBadges.jsx';
import { CollapseChevron } from '../../components/CollapseChevron.jsx';
import * as adminApi from '../../api/admin.api.js';

const TYPE_LABEL = { notification: 'Notification', promotion: 'Promotion' };
const EMPTY_FORM = {
  type: 'notification',
  title: '',
  body: '',
  imageUrl: '',
  ctaLabel: '',
  ctaLink: '',
  promoCode: '',
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
          promoCode: isPromotion && form.promoCode.trim() ? form.promoCode.trim() : null,
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
          <input
            value={form.promoCode}
            onChange={(e) => setForm((f) => ({ ...f, promoCode: e.target.value }))}
            placeholder="Promo code (optional)"
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
          />
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

function PublicationsTab() {
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
                promoCode: p.promoCode ?? '',
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
                  <PublicationStatusBadges status={p.status} isLive={p.isLive} />
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

// Structured-sections editor (QA2 item 4) - replaces the old single flat
// textarea. A section is one heading input + one body textarea (not a
// nested paragraph/bullet-list block editor): a run of "- "-prefixed lines
// in body renders as a bullet list on the public page and anything else
// as a paragraph (see apps/web/src/lib/policySections.js) - that's what
// lets "add, remove, reorder, edit a section" stay this simple while still
// reproducing real multi-paragraph, mixed-list policy text exactly.
//
// Collapsed by default (own local state, not persisted) - unlike
// AdminCategories.jsx's collapsible cards, which default open since a
// service list is short, a policy document can run to 15+ sections and
// collapsing it is the more useful default on a screen that also has the
// Publications tab's own long list above it.
function PolicyEditor({ policy, busy, onSave, onPublishToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(policy.title);
  const [subtitle, setSubtitle] = useState(policy.subtitle || '');
  const [effectiveDate, setEffectiveDate] = useState(policy.effectiveDate || '');
  const [docNote, setDocNote] = useState(policy.docNote || '');
  const [sections, setSections] = useState(policy.sections);

  const dirty =
    title !== policy.title ||
    subtitle !== (policy.subtitle || '') ||
    effectiveDate !== (policy.effectiveDate || '') ||
    docNote !== (policy.docNote || '') ||
    JSON.stringify(sections) !== JSON.stringify(policy.sections);

  function updateSection(index, patch) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, { heading: '', body: '' }]);
  }

  function removeSection(index) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSection(index, direction) {
    setSections((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      effectiveDate: effectiveDate.trim() || null,
      docNote: docNote.trim() || null,
      sections: sections.map((s) => ({ heading: s.heading.trim(), body: s.body.trim() })),
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <CollapseChevron collapsed={!expanded} />
          <p className="font-semibold">{policy.title}</p>
          <span className="text-sm text-text-muted">
            ({policy.sections.length} section{policy.sections.length === 1 ? '' : 's'})
          </span>
        </button>
        <PublicationStatusBadges status={policy.status} isLive={policy.isLive} />
      </div>

      {expanded && (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <input
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              placeholder="Effective date label (e.g. &quot;Effective date: 1 January 2027&quot;)"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
            <input
              value={docNote}
              onChange={(e) => setDocNote(e.target.value)}
              placeholder="Footer note"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
            />
          </div>

          <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Sections</p>
          <div className="flex flex-col gap-3">
            {sections.map((section, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={section.heading}
                    onChange={(e) => updateSection(i, { heading: e.target.value })}
                    placeholder="Section heading"
                    className="flex-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
                  />
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveSection(i, -1)}
                    aria-label="Move section up"
                    className="rounded-md border border-border px-2 py-1 text-xs text-text-muted disabled:opacity-30"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={i === sections.length - 1}
                    onClick={() => moveSection(i, 1)}
                    aria-label="Move section down"
                    className="rounded-md border border-border px-2 py-1 text-xs text-text-muted disabled:opacity-30"
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    disabled={sections.length === 1}
                    onClick={() => removeSection(i)}
                    className="rounded-md border border-border px-2 py-1 text-xs text-danger disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={section.body}
                  onChange={(e) => updateSection(i, { body: e.target.value })}
                  placeholder={'Paragraph text. Start consecutive lines with "- " for a bullet list.'}
                  className="mt-2 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
                />
              </div>
            ))}
            <Button variant="secondary" onClick={addSection} className="self-start px-4 py-1.5 text-sm">
              + Add section
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="secondary" disabled={busy || !dirty} onClick={handleSave} className="px-4 py-1.5 text-sm">
              {busy ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onPublishToggle} className="px-4 py-1.5 text-sm">
              {policy.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function PoliciesTab() {
  const [policies, setPolicies] = useState(null);
  const [error, setError] = useState('');
  const [busyType, setBusyType] = useState(null);

  function load() {
    adminApi
      .listPolicies()
      .then(({ policies }) => setPolicies(policies))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSave(policyType, input) {
    setBusyType(policyType);
    setError('');
    try {
      await adminApi.updatePolicy(policyType, input);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyType(null);
    }
  }

  async function handlePublishToggle(policy) {
    setBusyType(policy.policyType);
    setError('');
    try {
      if (policy.status === 'published') {
        await adminApi.unpublishPolicy(policy.policyType);
      } else {
        await adminApi.publishPolicy(policy.policyType);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div>
      <p className="text-xs text-text-muted">
        Terms of Service, Privacy Policy, and Community Guidelines - a fixed set of documents, edited in place.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!policies && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      <div className="mt-4 flex flex-col gap-4">
        {policies?.map((policy) => (
          <PolicyEditor
            key={policy.policyType}
            policy={policy}
            busy={busyType === policy.policyType}
            onSave={(input) => handleSave(policy.policyType, input)}
            onPublishToggle={() => handlePublishToggle(policy)}
          />
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'policies', label: 'Policies' },
];

// Content merge (target-spec Phase 5) - Publications (notifications/
// promotions) and Policies (Terms/Privacy/Community Guidelines) on one
// screen as tabs, replacing two separate nav items. Pure UI/navigation
// merge - neither tab's data model, editing logic, or API calls changed,
// only where they're rendered from (PublicationsTab/PoliciesTab are the
// same components each screen used to export directly, unchanged apart
// from dropping their own page-level <h1> now that the wrapper owns it,
// and using the shared PublicationStatusBadges the two screens had
// identically duplicated).
export function AdminContent() {
  const [tab, setTab] = useState('publications');

  return (
    <div>
      <h1 className="text-2xl font-bold">Content</h1>

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
        {tab === 'publications' && <PublicationsTab />}
        {tab === 'policies' && <PoliciesTab />}
      </div>
    </div>
  );
}
