import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { timeAgo } from '../../lib/timeAgo.js';
import * as adminApi from '../../api/admin.api.js';

function ApprovalRow({ item, onDecide }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');

  async function handleDecide(decision) {
    setError('');
    setBusy(true);
    try {
      if (item.kind === 'document') {
        await (decision === 'approve'
          ? adminApi.approveDocument(item.id)
          : adminApi.rejectDocument(item.id, comment.trim() || null));
      } else {
        await (decision === 'approve'
          ? adminApi.approveService(item.id)
          : adminApi.rejectService(item.id, comment.trim() || null));
      }
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
          <Badge tone={item.kind === 'document' ? 'neutral' : 'warning'}>
            {item.kind === 'document' ? 'Verification document' : 'New service category'}
          </Badge>
        </div>
        {item.kind === 'document' ? (
          <p className="mt-1 text-sm text-text-muted">
            <span className="capitalize">{item.docType}</span> &middot;{' '}
            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-brand-solid underline">
              View document
            </a>
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            {item.serviceName} ({item.category}) &middot; Rs. {item.price}
            {item.highRisk && (
              <>
                {' '}
                &middot; <span className="text-danger">High risk</span>
              </>
            )}
            {item.documentUrl && (
              <>
                {' '}
                &middot;{' '}
                <a href={item.documentUrl} target="_blank" rel="noreferrer" className="text-brand-solid underline">
                  View supporting document
                </a>
              </>
            )}
          </p>
        )}
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
    </Card>
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
        Worker verification documents and new-category service requests waiting on review.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!queue && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {queue?.length === 0 && <p className="mt-4 text-sm text-text-muted">Nothing pending - all caught up.</p>}

      <div className="mt-6 flex flex-col gap-3">
        {queue?.map((item) => (
          <ApprovalRow key={`${item.kind}-${item.id}`} item={item} onDecide={handleDecided} />
        ))}
      </div>
    </div>
  );
}
