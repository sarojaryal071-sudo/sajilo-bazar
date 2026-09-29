import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { PortfolioItemModal } from '../../components/PortfolioItemModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { humanizeCategory } from '../../lib/humanize.js';
import * as usersApi from '../../api/users.api.js';
import * as workersApi from '../../api/workers.api.js';

// Worker-only edit screen (Account page restructure) - the one place bio,
// description, full name/email and portfolio are actually editable now.
// Profile.jsx itself shows all of this read-only and links here via its
// "Edit profile" button; a customer never reaches this route (they still
// edit full name/email in place on Profile.jsx, since they have no
// bio/description/portfolio to edit).
//
// Full name/email/bio/description commit together behind one "Save" tap
// (reusing the three existing field-update endpoints in parallel - no new
// combined endpoint needed for that). Portfolio items are the exception:
// each add/edit/delete/reorder already commits immediately through its own
// existing endpoint, same as before this round, so they aren't part of
// that batched Save.
export function EditProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email || '', bio: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [portfolioItems, setPortfolioItems] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [servicesCategories, setServicesCategories] = useState([]);
  const [portfolioError, setPortfolioError] = useState('');
  const [busyItemId, setBusyItemId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then((data) => {
        setForm((prev) => ({ ...prev, bio: data.profile.bio || '', description: data.profile.description || '' }));
        setPortfolioItems(data.portfolioItems || []);
        setServicesCategories(data.services.map((s) => s.category));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    workersApi
      .getServiceCatalog()
      .then(({ services }) => setCatalogCategories([...new Set(services.map((s) => s.category))].sort()))
      .catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await Promise.all([
        usersApi.updateMe({ fullName: form.fullName, email: form.email || null }),
        workersApi.updateBio(form.bio.trim() || null),
        workersApi.updateDescription(form.description.trim() || null),
      ]);
      await refreshUser();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  function handlePortfolioItemSaved(saved) {
    setPortfolioItems((prev) =>
      prev.some((i) => i.id === saved.id) ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved]
    );
  }

  async function handleDeletePortfolioItem(id) {
    if (!window.confirm('Delete this portfolio item?')) return;
    setBusyItemId(id);
    setPortfolioError('');
    try {
      await workersApi.deletePortfolioItem(id);
      setPortfolioItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setPortfolioError(err.message);
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleMovePortfolioItem(id, direction) {
    const index = portfolioItems.findIndex((i) => i.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= portfolioItems.length) return;
    const reordered = [...portfolioItems];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setPortfolioItems(reordered);
    setPortfolioError('');
    try {
      await workersApi.reorderPortfolio(reordered.map((i) => i.id));
    } catch (err) {
      setPortfolioError(err.message);
    }
  }

  if (loading) {
    return (
      <Screen fillHeight={false}>
        <p className="text-sm text-text-muted">Loading...</p>
      </Screen>
    );
  }

  return (
    <Screen fillHeight={false}>
      <button onClick={() => navigate(-1)} className="self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="mt-4 text-2xl font-bold">Edit profile</h1>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Input
            label="Full name"
            name="fullName"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Bio</span>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={500}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-brand-solid"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Description</span>
            <span className="text-xs text-text-muted">Shown on your public profile, below your details.</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. what I do, how I work, how I handle mistakes..."
              maxLength={2000}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-brand-solid"
            />
          </label>
        </Card>

        {/* Locked per existing rules - never editable here (or anywhere). */}
        <p className="text-xs text-text-muted">
          Your profile photo and area of service can't be changed here - they're tied to your identity
          verification.
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Portfolio</p>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          >
            + Add work
          </Button>
        </div>
        {portfolioError && <p className="mt-2 text-sm text-danger">{portfolioError}</p>}
        {portfolioItems.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No work added yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {portfolioItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                {item.imageUrls[0] ? (
                  <img src={item.imageUrls[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                    <CategoryIcon category={item.category} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-text-muted">{humanizeCategory(item.category)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-0.5 text-text-muted">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMovePortfolioItem(item.id, 'up')}
                    aria-label="Move up"
                    className="disabled:opacity-30"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    disabled={index === portfolioItems.length - 1}
                    onClick={() => handleMovePortfolioItem(item.id, 'down')}
                    aria-label="Move down"
                    className="disabled:opacity-30"
                  >
                    &#9660;
                  </button>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setModalOpen(true);
                    }}
                    className="text-xs font-semibold text-brand-solid"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => handleDeletePortfolioItem(item.id)}
                    className="text-xs font-semibold text-danger disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PortfolioItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editingItem}
        categories={catalogCategories}
        defaultCategory={servicesCategories[0] ?? catalogCategories[0] ?? ''}
        onSaved={handlePortfolioItemSaved}
      />
    </Screen>
  );
}
