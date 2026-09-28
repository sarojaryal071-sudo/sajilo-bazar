import { useState } from 'react';
import { Badge } from './Badge.jsx';
import { Button } from './Button.jsx';
import * as workersApi from '../api/workers.api.js';

const DOC_STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };

// Per-document status while verification is pending (Round G) - previously
// a worker only ever saw a generic "Verification pending" card: no per-
// document status, no rejection reason, nothing telling them what to fix
// after an admin approved one document and rejected another. Resubmitting
// replaces just the one rejected document (PATCH /workers/me/documents/
// :docType - see workers.service.js resubmitDocument), leaving any other
// already-approved document untouched. Shared between WorkerApply.jsx's
// Step 5 pending screen (what a pending worker actually lands on - see
// postAuthRedirect.js) and WorkerDashboard.jsx (reachable by navigating
// there directly while still pending).
function DocumentStatusRow({ doc, onResubmitted }) {
  const [resubmitting, setResubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleResubmit(e) {
    e.preventDefault();
    if (!file) return setError('Choose a replacement file.');
    setError('');
    setSubmitting(true);
    try {
      const result = await workersApi.resubmitDocument(doc.docType, file);
      onResubmitted(result);
      setResubmitting(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate capitalize text-text-muted">{doc.docType.replace(/_/g, ' ')}</span>
        <Badge tone={DOC_STATUS_TONE[doc.status]}>{doc.status}</Badge>
      </div>
      {doc.status === 'rejected' && (
        <>
          {doc.reviewComment && <p className="mt-0.5 text-xs text-text-muted">{doc.reviewComment}</p>}
          {!resubmitting ? (
            <button
              type="button"
              onClick={() => setResubmitting(true)}
              className="mt-1 text-xs font-medium text-brand-solid"
            >
              Resubmit
            </button>
          ) : (
            <form onSubmit={handleResubmit} className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-alt p-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setResubmitting(false)}
                  className="flex-1 px-3 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 px-3 py-1.5 text-xs">
                  {submitting ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function DocumentStatusList({ documents, onResubmitted }) {
  if (!documents || documents.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <DocumentStatusRow key={doc.id} doc={doc} onResubmitted={onResubmitted} />
      ))}
    </div>
  );
}
