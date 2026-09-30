import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { DocumentViewerModal } from '../../components/DocumentViewerModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/bookingStatus.js';
import { canAccessDepartment } from '../../lib/adminDepartments.js';
import * as adminApi from '../../api/admin.api.js';

const MODERATION_TONE = { active: 'success', suspended: 'danger' };
const VERIFICATION_TONE = { pending: 'warning', approved: 'success', rejected: 'danger', unsubmitted: 'neutral' };
const DOC_STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const SERVICE_STATUS_TONE = { pending: 'warning', rejected: 'danger' };

// A pending document's own approve/reject controls, with the note (per-
// document review_comment) shown back to the worker on reject - this is
// what replaces AdminApprovals' old per-document row: reviewing now
// happens right here, on the same worker-detail card Users always used.
function DocumentRow({ doc, canEdit, onDecided }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [viewing, setViewing] = useState(false);

  async function handleDecide(decision) {
    setError('');
    setBusy(true);
    try {
      const { document } =
        decision === 'approve'
          ? await adminApi.approveDocument(doc.id)
          : await adminApi.rejectDocument(doc.id, comment.trim() || null);
      onDecided(document);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setViewing(true)} className="capitalize text-brand-solid underline">
          {doc.docType.replace(/_/g, ' ')}
        </button>
        <Badge tone={DOC_STATUS_TONE[doc.status]}>{doc.status}</Badge>
      </div>
      {doc.status === 'rejected' && doc.reviewComment && (
        <p className="mt-0.5 text-xs text-text-muted">{doc.reviewComment}</p>
      )}
      {doc.status === 'pending' && canEdit && (
        <div className="mt-1.5">
          {error && <p className="mb-1.5 text-xs text-danger">{error}</p>}
          {rejecting ? (
            <div className="flex flex-col gap-1.5">
              <input
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Reason for rejecting (shown to the worker)"
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-solid"
              />
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => setRejecting(false)} className="px-2.5 py-1 text-xs">
                  Cancel
                </Button>
                <Button disabled={busy} onClick={() => handleDecide('reject')} className="px-2.5 py-1 text-xs">
                  Confirm reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)} className="px-2.5 py-1 text-xs">
                Reject
              </Button>
              <Button disabled={busy} onClick={() => handleDecide('approve')} className="px-2.5 py-1 text-xs">
                Approve
              </Button>
            </div>
          )}
        </div>
      )}
      {viewing && (
        <DocumentViewerModal documentId={doc.id} label={doc.docType.replace(/_/g, ' ')} onClose={() => setViewing(false)} />
      )}
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Document-based password reset review (target-spec Phase 9/10) - the
// admin is expected to have already opened this worker's verification
// documents in the card just above (same DocumentViewerModal, no separate
// upload/viewer UI built for this) before deciding. Approving shows the
// issued temp password exactly once, inline, since the backend never
// returns it again after this response.
function PasswordResetRequestCard({ request, canEdit, onDecided }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  async function handleApprove() {
    setError('');
    setBusy(true);
    try {
      const { tempPassword: issued } = await adminApi.approvePasswordReset(request.id);
      setTempPassword(issued);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDeny() {
    setError('');
    setBusy(true);
    try {
      await adminApi.denyPasswordReset(request.id, reason.trim() || null);
      onDecided();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card className="mt-4 border border-warning/40">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Password reset request</p>
        <Badge tone="warning">pending</Badge>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Requested {formatDateTime(request.requestedAt)}. Confirm identity against the verification documents above
        before approving.
      </p>

      {tempPassword ? (
        <div className="mt-3 rounded-md border border-success/40 bg-success/5 p-3 text-sm">
          <p className="font-medium text-success">Temp password issued - share it with the worker now:</p>
          <p className="mt-1 font-mono text-base tracking-wide">{tempPassword}</p>
          <p className="mt-1 text-xs text-text-muted">
            This is shown once. The worker will be required to change it on their next login.
          </p>
        </div>
      ) : (
        canEdit && (
          <div className="mt-3">
            {error && <p className="mb-2 text-xs text-danger">{error}</p>}
            {denying ? (
              <div className="flex flex-col gap-1.5">
                <input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for denying (shown to the worker)"
                  className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-solid"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={busy} onClick={() => setDenying(false)} className="px-2.5 py-1 text-xs">
                    Cancel
                  </Button>
                  <Button disabled={busy} onClick={handleDeny} className="px-2.5 py-1 text-xs">
                    Confirm deny
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => setDenying(true)} className="px-2.5 py-1 text-xs">
                  Deny
                </Button>
                <Button disabled={busy} onClick={handleApprove} className="px-2.5 py-1 text-xs">
                  Approve &amp; issue temp password
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </Card>
  );
}

const TIER_LABEL = { top_performer: 'Top performer', standard: 'Standard', below_threshold: 'Below threshold' };
const TIER_TONE = { top_performer: 'success', standard: 'neutral', below_threshold: 'warning' };

// Worker Performance tab (target-spec Phase 9/10) - the individual view of
// the same Dashboard-wide numbers Phase 7 already built (flags/tier) plus
// Phase 1's earnings ledger, scoped to one worker. Fetched lazily, only
// once the tab is actually opened.
function WorkerPerformanceTab({ workerId }) {
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getUserPerformance(workerId)
      .then(({ performance: p }) => setPerformance(p))
      .catch((err) => setError(err.message));
  }, [workerId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!performance) return <p className="text-sm text-text-muted">Loading...</p>;

  const flaggedReasons = performance.flags
    ? Object.entries({
        'High cancellation rate': performance.flags.highCancellationRate,
        'Low rating': performance.flags.lowRating,
        Inactive: performance.flags.inactive,
      }).filter(([, v]) => v)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-4 text-center text-sm sm:grid-cols-4">
          <div>
            <p className="text-lg font-bold">
              {performance.ratingAvg.toFixed(1)} <span className="text-xs font-normal text-text-muted">({performance.reviewsCount})</span>
            </p>
            <p className="text-xs text-text-muted">Rating (reviews)</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {performance.cancellationRate === null ? '—' : `${(performance.cancellationRate * 100).toFixed(0)}%`}
            </p>
            <p className="text-xs text-text-muted">Cancellation rate ({performance.workerCancelledCount})</p>
          </div>
          <div>
            <p className="text-lg font-bold">{performance.completedCount}</p>
            <p className="text-xs text-text-muted">Jobs completed</p>
          </div>
          <div>
            <p className="text-lg font-bold">Rs. {performance.totalEarned.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Total earned</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Standing</p>
          {performance.tier && <Badge tone={TIER_TONE[performance.tier]}>{TIER_LABEL[performance.tier]}</Badge>}
        </div>
        {performance.flags === null ? (
          <p className="mt-2 text-sm text-text-muted">
            Not evaluated - flagging only applies to approved workers.
          </p>
        ) : flaggedReasons.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Not currently flagged.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-danger">
            {flaggedReasons.map(([label]) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="font-semibold">Earnings by month</p>
        <p className="mt-1 text-xs text-text-muted">This month: Rs. {performance.thisMonthEarned.toLocaleString()}</p>
        {performance.monthlyEarnings.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No completed jobs yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {performance.monthlyEarnings.map((m) => (
              <div key={m.period} className="flex justify-between">
                <span className="text-text-muted">
                  {new Date(m.period).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                </span>
                <span className="font-medium">Rs. {m.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const canEdit = canAccessDepartment(
    { isSuperAdmin: viewer.isSuperAdmin, departments: viewer.departments ?? [] },
    'people_content'
  );
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    adminApi
      .getUserDetail(id)
      .then((data) => {
        setDetail(data);
        setNotesDraft(data.user.adminNotes || '');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // Deciding a document can also flip the worker's own overall
  // verificationStatus (the last document clearing moves them to fully
  // "approved" - see admin.service.js decideDocument), so this refetches
  // the whole detail rather than just patching the one document in place -
  // simplest way to keep the header badge/handle and every document's
  // status all correctly in sync with each other.
  function refetchDetail() {
    adminApi.getUserDetail(id).then(setDetail).catch((err) => setError(err.message));
  }

  async function handleToggleStatus() {
    setTogglingStatus(true);
    setError('');
    try {
      const { user } = detail.user.moderationStatus === 'active'
        ? await adminApi.suspendUser(id)
        : await adminApi.reinstateUser(id);
      setDetail((prev) => ({ ...prev, user: { ...prev.user, moderationStatus: user.moderationStatus } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setError('');
    try {
      await adminApi.setUserNotes(id, notesDraft.trim() || null);
      setNotesSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  if (error && !detail) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>
        <p className="mt-4 text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!detail) return <p className="text-sm text-text-muted">Loading...</p>;

  const { user, worker, bookings } = detail;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted">&larr; Back</button>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.profileImageUrl ? (
            <button
              type="button"
              onClick={() => setViewingPhoto(true)}
              aria-label="View profile photo"
              className="rounded-full"
            >
              <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={56} />
            </button>
          ) : (
            <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={56} />
          )}
          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-sm text-text-muted">
              {user.clientId} &middot; <span className="capitalize">{user.role}</span> &middot; joined{' '}
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={MODERATION_TONE[user.moderationStatus]}>{user.moderationStatus}</Badge>
          {user.role !== 'admin' && canEdit && (
            <Button
              variant={user.moderationStatus === 'active' ? 'secondary' : 'primary'}
              disabled={togglingStatus}
              onClick={handleToggleStatus}
            >
              {togglingStatus
                ? 'Working...'
                : user.moderationStatus === 'active'
                  ? 'Suspend'
                  : 'Reinstate'}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {viewingPhoto && (
        <DocumentViewerModal userId={user.id} label="Profile photo" onClose={() => setViewingPhoto(false)} />
      )}

      <Card className="mt-6">
        <p className="font-semibold">Contact</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Phone</span>
            <span>{user.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Email</span>
            <span>{user.email || '—'}</span>
          </div>
        </div>
      </Card>

      {worker && (
        <div className="mt-4 flex gap-2 border-b border-border">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'performance', label: 'Performance' },
          ].map((t) => (
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
      )}

      {worker && tab === 'overview' && (
        <>
          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Worker profile</p>
                {worker.profile.handle && (
                  <p className="text-xs text-text-muted">{worker.profile.handle}</p>
                )}
              </div>
              <Badge tone={VERIFICATION_TONE[worker.profile.verificationStatus]}>
                {worker.profile.verificationStatus}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-lg font-bold">{worker.profile.ratingAvg.toFixed(1)}</p>
                <p className="text-xs text-text-muted">Rating</p>
              </div>
              <div>
                <p className="text-lg font-bold">{worker.profile.jobsCompletedCount}</p>
                <p className="text-xs text-text-muted">Jobs done</p>
              </div>
              <div>
                <p className="text-lg font-bold">{worker.reviewsCount}</p>
                <p className="text-xs text-text-muted">Reviews</p>
              </div>
            </div>

            {worker.profile.bio && (
              <>
                <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  About (from applicant)
                </p>
                <p className="text-sm text-text-muted">{worker.profile.bio}</p>
              </>
            )}

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Services</p>
            <div className="flex flex-col gap-1.5 text-sm">
              {worker.services.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-text-muted">{s.serviceName}</span>
                  <div className="flex items-center gap-2">
                    {SERVICE_STATUS_TONE[s.approvalStatus] && (
                      <Badge tone={SERVICE_STATUS_TONE[s.approvalStatus]}>{s.approvalStatus}</Badge>
                    )}
                    <span className="font-medium">Rs. {s.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Verification documents
            </p>
            <div className="flex flex-col gap-2.5 text-sm">
              {worker.documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} canEdit={canEdit} onDecided={refetchDetail} />
              ))}
            </div>
          </Card>

          {worker.passwordResetRequest && (
            <PasswordResetRequestCard
              request={worker.passwordResetRequest}
              canEdit={canEdit}
              onDecided={refetchDetail}
            />
          )}
        </>
      )}

      {worker && tab === 'performance' && (
        <div className="mt-4">
          <WorkerPerformanceTab workerId={user.id} />
        </div>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Admin notes</p>
        <textarea
          rows={3}
          value={notesDraft}
          disabled={!canEdit}
          onChange={(e) => {
            setNotesDraft(e.target.value);
            setNotesSaved(false);
          }}
          placeholder={canEdit ? 'Internal notes about this user - not visible to them.' : 'No notes.'}
          className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid disabled:opacity-60"
        />
        {canEdit && (
          <div className="mt-2 flex items-center gap-3">
            <Button variant="secondary" disabled={savingNotes} onClick={handleSaveNotes}>
              {savingNotes ? 'Saving...' : 'Save notes'}
            </Button>
            {notesSaved && <span className="text-sm text-success">Saved</span>}
          </div>
        )}
      </Card>

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Booking history</p>
      {bookings.length === 0 ? (
        <p className="text-sm text-text-muted">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface-raised shadow-resting">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Service(s)</th>
                <th className="px-4 py-3 font-medium">Other party</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const otherParty = b.customerId === Number(id) ? b.workerName : b.customerName;
                return (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/admin/bookings/${b.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt"
                  >
                    <td className="px-4 py-3 text-brand-solid">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3 text-text-muted">{b.serviceNames}</td>
                    <td className="px-4 py-3 text-text-muted">{otherParty || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">{b.price !== null ? `Rs. ${b.price}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
