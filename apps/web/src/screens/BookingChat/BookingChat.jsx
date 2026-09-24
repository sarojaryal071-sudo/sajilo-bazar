import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as bookingsApi from '../../api/bookings.api.js';

const POLL_MS = 3000;
const NEAR_BOTTOM_PX = 48;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 8a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .87-.5l.86-1.5a1 1 0 0 1 .87-.5h4.4a1 1 0 0 1 .87.5l.86 1.5a1 1 0 0 0 .87.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M21 11.5 12.5 20a4.5 4.5 0 0 1-6.36-6.36L14.5 5.28a3 3 0 0 1 4.24 4.24l-8.37 8.37a1.5 1.5 0 0 1-2.12-2.12l7.66-7.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 20 18-8L3 4v6l12 2-12 2v6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Small popup anchored above the "+" button, Messenger-style - camera and
// file-picker options live behind it rather than as extra icons crowding
// the composer bar itself.
function AttachMenu({ onCamera, onFile, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 z-50 mb-2 flex flex-col gap-1 rounded-2xl bg-surface-raised p-2 shadow-raised"
      >
        <button
          type="button"
          onClick={onCamera}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-surface-alt"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand">
            <CameraIcon />
          </span>
          Camera
        </button>
        <button
          type="button"
          onClick={onFile}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-surface-alt"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand">
            <PaperclipIcon />
          </span>
          Attach file
        </button>
      </motion.div>
    </>
  );
}

// Not rendered inside AppShell (see App.jsx) - a chat has no bottom nav, the
// composer takes its place, so this screen builds its own full-height
// header/scroll/composer layout rather than using the shared Screen shell.
export function BookingChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [showJump, setShowJump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [toast, setToast] = useState('');

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bookingsApi
      .getDetail(id)
      .then(({ booking }) => setBooking(booking))
      .catch((err) => setError(err.message));
  }, [id]);

  // Polling, not sockets - real-time chat is Phase 3's socket.io work
  // (see PROJECT_BRIEF.md); this just needs messages to show up promptly.
  useEffect(() => {
    let cancelled = false;
    function poll() {
      bookingsApi
        .listMessages(id)
        .then(({ messages }) => {
          if (!cancelled) setMessages(messages);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  // Anchors the view to the newest message on first load, and on any new
  // message while the user is already at (or near) the bottom. If they've
  // scrolled up to read history, an incoming message doesn't yank them back
  // down - it just leaves the jump-to-latest button showing.
  useEffect(() => {
    const grew = messages.length > prevCountRef.current;
    const firstLoad = prevCountRef.current === 0 && messages.length > 0;
    if (grew && (firstLoad || atBottomRef.current)) {
      bottomRef.current?.scrollIntoView({ behavior: firstLoad ? 'auto' : 'smooth', block: 'end' });
      atBottomRef.current = true;
      setShowJump(false);
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distance < NEAR_BOTTOM_PX;
    atBottomRef.current = isAtBottom;
    setShowJump(!isAtBottom);
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    atBottomRef.current = true;
    setShowJump(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setError('');
    try {
      const { message } = await bookingsApi.sendMessage(id, text);
      atBottomRef.current = true;
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleMicTap() {
    setToast('Voice messages coming soon');
  }

  function openCamera() {
    setMenuOpen(false);
    cameraInputRef.current?.click();
  }

  function openFilePicker() {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      setError('Only images (JPEG/PNG/WebP/GIF) and PDF files are allowed.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('Attachments must be 10MB or smaller.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const { message } = await bookingsApi.sendAttachment(id, file);
      atBottomRef.current = true;
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const otherName = booking && (user.role === 'worker' ? booking.customerName : booking.workerName);
  const otherImage = booking && (user.role === 'worker' ? booking.customerImageUrl : booking.workerImageUrl);
  const otherHandle = booking && user.role !== 'worker' ? booking.workerHandle : null;
  const hasDraft = draft.trim().length > 0;

  return (
    <div className="flex h-dvh flex-col bg-surface-alt">
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted"
            aria-label="Back"
          >
            <BackIcon />
          </button>
          {otherName && <Avatar name={otherName} imageUrl={otherImage} size={36} />}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{otherName || 'Chat'}</h1>
            {otherHandle && <p className="truncate text-xs text-text-muted">{otherHandle}</p>}
          </div>
        </div>
      </header>

      {error && <p className="mx-auto w-full max-w-md px-5 pt-2 text-sm text-danger">{error}</p>}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-text-muted">No messages yet - say hello.</p>
            )}
            {messages.map((m) => {
              const isMine = m.senderId === user.id;
              const bubbleTone = isMine ? 'bg-brand text-text-onBrand' : 'bg-surface-raised text-text shadow-resting';
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {m.attachmentType === 'image' && (
                    <button
                      type="button"
                      onClick={() => setViewerUrl(m.attachmentUrl)}
                      className="max-w-[75%] overflow-hidden rounded-2xl shadow-resting"
                    >
                      <img src={m.attachmentUrl} alt="Attachment" className="max-h-64 w-full object-cover" />
                    </button>
                  )}
                  {m.attachmentType === 'pdf' && (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex max-w-[75%] items-center gap-2 rounded-2xl px-4 py-3 text-sm ${bubbleTone}`}
                    >
                      <FileIcon />
                      <span className="min-w-0 truncate">{m.attachmentName || 'Document'}</span>
                    </a>
                  )}
                  {m.message && (
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${bubbleTone} ${m.attachmentUrl ? 'mt-1' : ''}`}>
                      {m.message}
                    </div>
                  )}
                  <span className="mt-1 px-1 text-[11px] text-text-muted">{formatTime(m.createdAt)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {showJump && (
          <button
            onClick={jumpToBottom}
            aria-label="Jump to latest"
            className="absolute bottom-4 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-brand-solid shadow-raised"
          >
            <DownArrowIcon />
          </button>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-5"
            >
              <div className="rounded-full bg-text px-4 py-2 text-sm font-medium text-surface shadow-raised">
                {toast}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewerUrl(null)}
        >
          <button
            onClick={() => setViewerUrl(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white"
          >
            <CloseIcon />
          </button>
          <img src={viewerUrl} alt="Attachment full size" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileSelected}
      />

      <form onSubmit={handleSend} className="shrink-0 border-t border-border bg-surface">
        <div className="relative mx-auto w-full max-w-md px-5 py-3">
          {uploading && <p className="mb-1.5 text-xs text-text-muted">Uploading...</p>}
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface-alt pl-1 pr-2 focus-within:border-brand-solid">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={uploading}
                aria-label="Attach"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted disabled:opacity-50"
              >
                <PlusIcon />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <AttachMenu onCamera={openCamera} onFile={openFilePicker} onClose={() => setMenuOpen(false)} />
                )}
              </AnimatePresence>
            </div>

            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-text outline-none placeholder:text-text-muted"
            />

            <button
              type={hasDraft ? 'submit' : 'button'}
              onClick={hasDraft ? undefined : handleMicTap}
              aria-label={hasDraft ? 'Send' : 'Record voice message'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand"
            >
              {hasDraft ? <SendIcon /> : <MicIcon />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
