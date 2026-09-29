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

// Worker's photo tap target - view-only, full-screen, no edit affordance
// anywhere. The photo is tied to the identity verification done at
// onboarding (see workers.service.js apply) and must not be changeable
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

  useEffect(() => {
    if (!isWorker) return;
    workersApi.getMyWorkerData().then(setWorkerData).catch(() => {});
    trustScoreApi
      .getMyTrustScore()
      .then(({ trustScore }) => setTrustScore(trustScore))
      .catch(() => {});
  }, [isWorker]);

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

  // Role-gated tap target: a worker's photo is identity-locked (view only,
  // full-screen); a customer's opens the normal edit/replace file picker,
  // unchanged from before.
  function handlePhotoTap() {
    if (isWorker) {
      if (user.profileImageUrl) setPhotoViewerOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  const verificationApproved = workerData?.profile.verificationStatus === 'approved';

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

      {/* Header block: photo, name, bio (worker), badges, trust score - all
          read as one identity block, not scattered further down the page. */}
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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-text-muted">{user.clientId}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge className="capitalize">{user.role}</Badge>
            {workerData &&
              (verificationApproved ? (
                <VerifiedBadge />
              ) : (
                <Badge tone={VERIFICATION_TONE[workerData.profile.verificationStatus]}>
                  {workerData.profile.verificationStatus}
                </Badge>
              ))}
          </div>
          {isWorker && workerData?.profile.bio && (
            <p className="mt-1.5 text-sm text-text-muted">{workerData.profile.bio}</p>
          )}
          {uploadingPhoto && <p className="mt-1 text-xs text-text-muted">Uploading photo...</p>}
          {photoError && <p className="mt-1 text-xs text-danger">{photoError}</p>}
        </div>
      </div>

      {isWorker && <TrustMeter trustScore={trustScore} />}

      {/* Profile preview - read-only display of what a customer sees on the
          public profile (worker/:id). Editing any of this now happens on
          the dedicated Edit Profile screen below, not inline here. */}
      {isWorker && verificationApproved && (
        <Card className="mt-4">
          <p className="font-semibold">Description</p>
          <p className="mt-1 text-sm text-text-muted">
            {workerData?.profile.description || 'No description yet.'}
          </p>
        </Card>
      )}

      {isWorker && verificationApproved && (
        <Card className="mt-4">
          <p className="font-semibold">Portfolio</p>
          {!workerData?.portfolioItems || workerData.portfolioItems.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No work added yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {workerData.portfolioItems.map((item) => (
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
                </div>
              ))}
            </div>
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

      {isWorker && (
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/profile/edit')}>
          Edit profile
        </Button>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Account</p>
        <div className="mt-3">
          {!isWorker && editing ? (
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
              {/* Customers still edit full name/email in place here - the
                  dedicated Edit Profile screen above is worker-only (it
                  also covers bio/description/portfolio, which customers
                  don't have). */}
              {!isWorker && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

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

      {/* Last item in the page's normal scroll flow, on purpose - not
          fixed/sticky/pinned to the viewport, and not nested inside the
          Account card above, so it always reads as the final action on the
          page regardless of how much content is above it. */}
      <Button variant="danger" className="mt-4 w-full" onClick={logout}>
        Log out
      </Button>

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
