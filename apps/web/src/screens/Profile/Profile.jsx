import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { TrustMeter } from '../../components/TrustMeter.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
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

export function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [workerData, setWorkerData] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user.role !== 'worker') return;
    workersApi
      .getMyWorkerData()
      .then(setWorkerData)
      .catch(() => {});
    trustScoreApi
      .getMyTrustScore()
      .then(({ trustScore }) => setTrustScore(trustScore))
      .catch(() => {});
  }, [user.role]);

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

  return (
    <Screen fillHeight={false}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="relative shrink-0 rounded-full"
          aria-label="Change profile photo"
        >
          <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={64} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-solid text-white shadow-resting">
            <CameraIcon />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          className="hidden"
        />
        <div>
          <h1 className="text-xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-text-muted">{user.clientId}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge className="capitalize">{user.role}</Badge>
            {workerData && (
              <Badge tone={VERIFICATION_TONE[workerData.profile.verificationStatus]}>
                {workerData.profile.verificationStatus}
              </Badge>
            )}
          </div>
          {uploadingPhoto && <p className="mt-1 text-xs text-text-muted">Uploading photo...</p>}
          {photoError && <p className="mt-1 text-xs text-danger">{photoError}</p>}
        </div>
      </div>

      <Card className="mt-6">
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
          </div>
        )}
      </Card>

      {user.role === 'worker' && <TrustMeter trustScore={trustScore} />}

      {user.role === 'worker' && workerData?.profile.verificationStatus === 'approved' && (
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/worker/${user.id}`)}>
          View my public profile
        </Button>
      )}

      {user.role === 'worker' && workerData?.documents.length > 0 && (
        <Card className="mt-4">
          <p className="font-semibold">Submitted documents</p>
          <div className="mt-3 flex flex-col gap-2">
            {workerData.documents.map((doc) => (
              <div key={doc.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-text-muted">{doc.docType}</span>
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

      <Button variant="ghost" className="mt-8" onClick={logout}>
        Log out
      </Button>
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
