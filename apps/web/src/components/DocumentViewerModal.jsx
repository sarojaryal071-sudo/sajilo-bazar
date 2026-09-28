import { useEffect, useState } from 'react';
import * as adminApi from '../api/admin.api.js';

// In-page viewer for a verification document or a user's profile photo,
// replacing what used to be a plain <a href={doc.fileUrl} target="_blank">
// straight to the raw Cloudinary URL (see admin.service.js getDocumentFile
// for why that changed). Fetches the file's bytes through one of the
// admin-only proxy endpoints and renders them from a local object URL -
// the underlying Cloudinary URL never passes through this component or
// reaches the browser's address bar/history/network tab as a navigable
// link. Pass either documentId (a verification_documents row) or userId
// (a user's profile photo) - not both.
export function DocumentViewerModal({ documentId, userId, label, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let url = null;
    const fetchFile = userId != null ? adminApi.fetchUserPhotoFile(userId) : adminApi.fetchDocumentFile(documentId);
    fetchFile
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setContentType(blob.type);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-surface-raised p-4 shadow-raised"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold capitalize">{label || 'Document'}</p>
          <button onClick={onClose} aria-label="Close" className="text-text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto rounded-xl bg-surface-alt">
          {error && <p className="p-4 text-sm text-danger">{error}</p>}
          {!error && !blobUrl && <p className="text-sm text-text-muted">Loading...</p>}
          {!error &&
            blobUrl &&
            (contentType.startsWith('image/') ? (
              <img src={blobUrl} alt={label || 'Document'} className="max-h-[70vh] w-full object-contain" />
            ) : (
              <iframe title={label || 'Document'} src={blobUrl} className="h-[70vh] w-full rounded-xl" />
            ))}
        </div>
      </div>
    </div>
  );
}
