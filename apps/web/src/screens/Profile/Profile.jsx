import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { VerifiedBadge } from '../../components/VerifiedBadge.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { TrustMeter } from '../../components/TrustMeter.jsx';
import { PortfolioItemModal } from '../../components/PortfolioItemModal.jsx';
import { SettingsIcon } from '../../components/NavIcons.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { humanizeCategory } from '../../lib/humanize.js';
import * as usersApi from '../../api/users.api.js';
import * as workersApi from '../../api/workers.api.js';
import * as trustScoreApi from '../../api/trustScore.api.js';

const VERIFICATION_TONE = { pending: 'warning', approved: 'success', rejected: 'danger', unsubmitted: 'neutral' };
const DOC_STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Worker's photo tap target (UI round) - view-only, full-screen, no edit
// affordance anywhere. The photo is tied to the identity verification done
// at onboarding (see workers.service.js apply) and must not be changeable
// afterward - see users.controller.js uploadPhoto's matching backend guard.
function PhotoViewer({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
      role="dialog"
      aria-label="Profile photo"
    >
      <img src={imageUrl} alt="Profile" className="max-h-full max-w-full rounded-2xl object-contain" />
      <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 text-white">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isWorker = user.role === 'worker';

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [workerData, setWorkerData] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const fileInputRef = useRef(null);

  // Bio inline-edit (UI round) - the original onboarding bio, editable here
  // regardless of approval status (see workers.routes.js /me/bio).
  const [bio, setBio] = useState('');
  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState('');

  // Description + Portfolio (2026-09-27) - a worker's free-text profile
  // description and their past-work gallery, both edited here.
  const [description, setDescription] = useState('');
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [portfolioError, setPortfolioError] = useState('');
  const [busyItemId, setBusyItemId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (!isWorker) return;
    workersApi
      .getMyWorkerData()
      .then((data) => {
        setWorkerData(data);
        setBio(data.profile.bio || '');
        setDescription(data.profile.description || '');
        setPortfolioItems(data.portfolioItems || []);
      })
      .catch(() => {});
    workersApi
      .getServiceCatalog()
      .then(({ services }) => setCatalogCategories([...new Set(services.map((s) => s.category))].sort()))
      .catch(() => {});
    trustScoreApi
      .getMyTrustScore()
      .then(({ trustScore }) => setTrustScore(trustScore))
      .catch(() => {});
  }, [isWorker]);

  async function handleSaveBio() {
    setSavingBio(true);
    setBioError('');
    try {
      await workersApi.updateBio(bioDraft.trim() || null);
      setBio(bioDraft.trim());
      setBioEditing(false);
    } catch (err) {
      setBioError(err.message);
    } finally {
      setSavingBio(false);
    }
  }

  async function handleSaveDescription() {
    setSavingDescription(true);
    setDescriptionError('');
    try {
      await workersApi.updateDescription(description.trim() || null);
      setDescriptionDirty(false);
    } catch (err) {
      setDescriptionError(err.message);
    } finally {
      setSavingDescription(false);
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

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.updateMe({ fullName: form.fullName, email: form.email || null });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      await usersApi.uploadPhoto(file);
      await refreshUser();
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Role-gated tap target (UI round): a worker's photo is identity-locked
  // (view only, full-screen); a customer's opens the normal edit/replace
  // file picker, unchanged from before.
  function handlePhotoTap() {
    if (isWorker) {
      if (user.profileImageUrl) setPhotoViewerOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  return (
    <Screen fillHeight={false}>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="text-text-muted"
        >
          <SettingsIcon />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          onClick={handlePhotoTap}
          disabled={uploadingPhoto}
          className="relative shrink-0 rounded-full"
          aria-label={isWorker ? 'View profile photo' : 'Change profile photo'}
        >
          <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={64} />
          {!isWorker && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-solid text-white shadow-resting">
              <CameraIcon />
            </span>
          )}
        </button>
        {!isWorker && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            className="hidden"
          />
        )}
        <div>
          <h1 className="text-xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-text-muted">{user.clientId}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge className="capitalize">{user.role}</Badge>
            {workerData &&
              (workerData.profile.verificationStatus === 'approved' ? (
                <VerifiedBadge />
              ) : (
                <Badge tone={VERIFICATION_TONE[workerData.profile.verificationStatus]}>
                  {workerData.profile.verificationStatus}
                </Badge>
              ))}
          </div>
          {uploadingPhoto && <p className="mt-1 text-xs text-text-muted">Uploading photo...</p>}
          {photoError && <p className="mt-1 text-xs text-danger">{photoError}</p>}
        </div>
      </div>

      {isWorker && <TrustMeter trustScore={trustScore} />}

      {isWorker && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Bio</p>
            {!bioEditing && (
              <button
                type="button"
                onClick={() => {
                  setBioDraft(bio);
                  setBioError('');
                  setBioEditing(true);
                }}
                className="text-sm font-medium text-brand-solid"
              >
                Edit
              </button>
            )}
          </div>
          {bioEditing ? (
            <div className="mt-3 flex flex-col gap-3">
              <textarea
                rows={3}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-brand-solid"
              />
              {bioError && <p className="text-sm text-danger">{bioError}</p>}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={savingBio}
                  onClick={() => setBioEditing(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" disabled={savingBio} onClick={handleSaveBio}>
                  {savingBio ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-muted">{bio || 'No bio yet.'}</p>
          )}
        </Card>
      )}

      {isWorker && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Area of service</span>
            <span className="font-medium">{workerData?.profile.district || '—'}</span>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Account</p>
        <div className="mt-3">
          {editing ? (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
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
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <Row label="Phone" value={user.phone} />
              <Row label="Email" value={user.email || '—'} />
              {workerData?.profile.handle && <Row label="Worker ID" value={workerData.profile.handle} />}
              {formatDate(user.createdAt) && <Row label="Member since" value={formatDate(user.createdAt)} />}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
              {/* Last row in the Account section, on purpose (not a
                  standalone button floating after unrelated content lower
                  on the page) - a plain block-level row like the others
                  above it, not a narrow auto-width pill that reads as
                  centered on a short page. */}
              <Button variant="danger" className="w-full" onClick={logout}>
                Log out
              </Button>
            </div>
          )}
        </div>
      </Card>

      {isWorker && workerData?.profile.verificationStatus === 'approved' && (
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/worker/${user.id}`)}>
          View my public profile
        </Button>
      )}

      {isWorker && workerData?.profile.verificationStatus === 'approved' && (
        <>
          <Card className="mt-4">
            <p className="font-semibold">Description</p>
            <p className="mt-1 text-xs text-text-muted">Shown on your public profile, below your details.</p>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionDirty(true);
              }}
              placeholder="e.g. what I do, how I work, how I handle mistakes..."
              maxLength={2000}
              className="mt-3 w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-brand-solid"
            />
            {descriptionError && <p className="mt-1 text-sm text-danger">{descriptionError}</p>}
            {descriptionDirty && (
              <Button
                variant="secondary"
                className="mt-3 px-4 py-1.5 text-sm"
                disabled={savingDescription}
                onClick={handleSaveDescription}
              >
                {savingDescription ? 'Saving...' : 'Save description'}
              </Button>
            )}
          </Card>

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
            defaultCategory={workerData?.services?.[0]?.category ?? catalogCategories[0] ?? ''}
            onSaved={handlePortfolioItemSaved}
          />
        </>
      )}

      {isWorker && workerData?.documents.length > 0 && (
        <Card className="mt-4">
          <p className="font-semibold">Submitted documents</p>
          <div className="mt-3 flex flex-col gap-2">
            {workerData.documents.map((doc) => (
              <div key={doc.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{humanizeCategory(doc.docType)}</span>
                  <Badge tone={DOC_STATUS_TONE[doc.status] ?? 'neutral'}>{doc.status}</Badge>
                </div>
                {doc.status === 'rejected' && doc.reviewComment && (
                  <p className="mt-0.5 text-xs text-text-muted">{doc.reviewComment}</p>
                )}
              </div>
            ))}
          </div>
          {workerData.profile.verificationStatus === 'rejected' && (
            <Button onClick={() => navigate('/worker/apply')} variant="secondary" className="mt-3 w-full">
              Re-apply with new documents
            </Button>
          )}
        </Card>
      )}

      {isWorker && photoViewerOpen && (
        <PhotoViewer imageUrl={user.profileImageUrl} onClose={() => setPhotoViewerOpen(false)} />
      )}
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
