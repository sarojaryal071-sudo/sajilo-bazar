import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { DocumentViewerModal } from '../../components/DocumentViewerModal.jsx';
import { timeAgo } from '../../lib/timeAgo.js';
import { humanizeCategory } from '../../lib/humanize.js';
import * as adminApi from '../../api/admin.api.js';

// One card per pending worker (Round F, 2026-09-27) - a worker who
// submitted two identity documents used to show as two disconnected rows
// here. Reviewing (approve/reject per document, with a note) now happens
// on the same detail UI Users uses (GET /admin/users/:id under the hood),
// but at its own /admin/approvals/:id route (Round G) - a pending worker
// isn't in Users yet, and routing this through /admin/users/:id made the
// sidebar highlight "Users" while reviewing someone who, by definition,
// still belongs in Approvals. See App.jsx and AdminUserDetail.jsx.
function WorkerVerificationCard({ item }) {
  const parts = [];
  if (item.pendingCount > 0) parts.push(`${item.pendingCount} pending`);
  if (item.rejectedCount > 0) parts.push(`${item.rejectedCount} awaiting resubmission`);
  const summary = parts.length > 0 ? parts.join(', ') : `${item.totalCount} document(s)`;

  return (
    <Link to={`/admin/approvals/${item.workerId}`}>
      <Card className="flex items-center gap-4 hover:bg-surface-alt">
        <Avatar name={item.workerName} imageUrl={item.profileImageUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{item.workerName}</p>
            <Badge tone="neutral">Verification</Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">{summary}</p>
          <p className="mt-1 text-xs text-text-muted">Submitted {timeAgo(item.createdAt)}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-brand-solid">Review &rarr;</span>
      </Card>
    </Link>
  );
}

// Cross-category service requests (Phase 5) - a separate, unrelated queue
// from worker identity verification, unchanged in shape from before this
// round. Still one row per request, still actioned inline here.
function ServiceApprovalRow({ item, onDecide }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [viewingDoc, setViewingDoc] = useState(false);

  async function handleDecide(decision) {
    setError('');
    setBusy(true);
    try {
      await (decision === 'approve'
        ? adminApi.approveService(item.id)
        : adminApi.rejectService(item.id, comment.trim() || null));
      onDecide(item);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{item.workerName}</p>
          <Badge tone="warning">New service category</Badge>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {item.serviceName} ({humanizeCategory(item.category)}) &middot; Rs. {item.price}
          {item.highRisk && (
            <>
              {' '}
              &middot; <span className="text-danger">High risk</span>
            </>
          )}
          {item.documentId && (
            <>
              {' '}
              &middot;{' '}
              <button type="button" onClick={() => setViewingDoc(true)} className="text-brand-solid underline">
                View supporting document
              </button>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-text-muted">Submitted {timeAgo(item.createdAt)}</p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        {rejecting && (
          <input
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for rejecting (shown to the worker)"
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
          />
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {rejecting ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => handleDecide('reject')}>
              Confirm reject
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
              Reject
            </Button>
            <Button disabled={busy} onClick={() => handleDecide('approve')}>
              Approve
            </Button>
          </>
        )}
      </div>
      {viewingDoc && (
        <DocumentViewerModal
          documentId={item.documentId}
          label="Supporting document"
          onClose={() => setViewingDoc(false)}
        />
      )}
    </Card>
  );
}

// Document-based password reset queue (target-spec Phase 9/10) - same
// "link to the shared detail page rather than review inline" pattern as
// WorkerVerificationCard above: the actual approve/deny controls live on
// AdminUserDetail (PasswordResetRequestCard) next to the verification
// documents an admin needs open to confirm identity before deciding.
function PasswordResetRequestCard({ item }) {
  return (
    <Link to={`/admin/approvals/${item.workerId}`}>
      <Card className="flex items-center gap-4 hover:bg-surface-alt">
        <Avatar name={item.workerName} imageUrl={item.profileImageUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{item.workerName}</p>
            <Badge tone="warning">Password reset</Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">Locked out - requesting a temp password</p>
          <p className="mt-1 text-xs text-text-muted">Requested {timeAgo(item.createdAt)}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-brand-solid">Review &rarr;</span>
      </Card>
    </Link>
  );
}

export function AdminApprovals() {
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getApprovalsQueue()
      .then(({ queue }) => setQueue(queue))
      .catch((err) => setError(err.message));
  }, []);

  function handleDecided(decidedItem) {
    setQueue((prev) => prev.filter((item) => !(item.kind === decidedItem.kind && item.id === decidedItem.id)));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Approvals</h1>
      <p className="mt-1 text-sm text-text-muted">
        Workers awaiting verification and new-category service requests waiting on review.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!queue && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {queue?.length === 0 && <p className="mt-4 text-sm text-text-muted">Nothing pending - all caught up.</p>}

      <div className="mt-6 flex flex-col gap-3">
        {queue?.map((item) => {
          if (item.kind === 'worker_verification') {
            return <WorkerVerificationCard key={`worker-${item.workerId}`} item={item} />;
          }
          if (item.kind === 'password_reset_request') {
            return <PasswordResetRequestCard key={`password-reset-${item.id}`} item={item} />;
          }
          return <ServiceApprovalRow key={`service-${item.id}`} item={item} onDecide={handleDecided} />;
        })}
      </div>
    </div>
  );
}
