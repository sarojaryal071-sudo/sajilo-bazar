import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useIsDesktop } from '../../hooks/useIsDesktop.js';
import * as bookingsApi from '../../api/bookings.api.js';
import { WORKER_DESKTOP_BLOCK_MESSAGE, WORKER_ACTIVE_BOOKING_STATUSES } from '../../lib/workerDesktopBlock.js';

const POLL_MS = 3000;
const NEAR_BOTTOM_PX = 48;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
// Typing indicator timing (Messenger/WhatsApp-style, 2026-09-27) - start is
// throttled so a keystroke burst doesn't spam the socket, stop fires
// immediately on send or after a short pause, and the safety-net timeout
// clears a stuck "typing..." if a stop event is ever missed (dropped
// connection, tab closed mid-type, etc).
const TYPING_THROTTLE_MS = 2000;
const TYPING_STOP_DEBOUNCE_MS = 3000;
const TYPING_SAFETY_MS = 5000;

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

function CheckIcon({ className = '' }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className={className}
    >
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Messenger/WhatsApp-style ticks, own sent messages only - single = sent,
// double gray = delivered, double brand-colored = seen. Read implies
// delivered (chat.model.js backfills deliveredAt when readAt is set), so
// checking readAt first is enough to pick the right state.
function MessageTicks({ message }) {
  if (message.readAt) {
    return (
      <span className="inline-flex text-brand-solid" aria-label="Seen">
        <CheckIcon />
        <CheckIcon className="-ml-2" />
      </span>
    );
  }
  if (message.deliveredAt) {
    return (
      <span className="inline-flex text-text-muted" aria-label="Delivered">
        <CheckIcon />
        <CheckIcon className="-ml-2" />
      </span>
    );
  }
  return (
    <span className="inline-flex text-text-muted" aria-label="Sent">
      <CheckIcon />
    </span>
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
  const bookingId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const isDesktop = useIsDesktop();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [showJump, setShowJump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [toast, setToast] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingThrottleRef = useRef(0);
  const typingStopTimerRef = useRef(null);
  const typingSafetyTimerRef = useRef(null);

  useEffect(() => {
    bookingsApi
      .getDetail(id)
      .then(({ booking }) => setBooking(booking))
      .catch((err) => setError(err.message));
  }, [id]);

  // Message content itself still travels over plain HTTP + polling, not a
  // socket push - only the delivered/seen ticks and typing indicator ride
  // the socket (see below). This just needs messages to show up promptly.
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

  // Joining is how the server knows this socket is "present" in this
  // booking's chat, for the delivered-tick proxy (see chat.service.js) -
  // rejoins on every reconnect too, since a dropped/re-established socket
  // gets a fresh server-side session with no memory of prior room joins.
  useEffect(() => {
    if (!socket) return;
    function join() {
      socket.emit('chat:join', { bookingId });
    }
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('chat:leave', { bookingId });
    };
  }, [socket, bookingId]);

  // Delivered/seen ticks pushed live from the other party's connection -
  // merges into whatever the poll above already has, so a tick can flip
  // mid-poll-interval without waiting for the next 3s cycle.
  useEffect(() => {
    if (!socket) return;
    function applyStatus(field) {
      return (payload) => {
        if (payload.bookingId !== bookingId) return;
        const ids = new Set(payload.messageIds);
        setMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, [field]: payload[field] } : m)));
      };
    }
    const onDelivered = applyStatus('deliveredAt');
    const onRead = applyStatus('readAt');
    socket.on('chat:delivered', onDelivered);
    socket.on('chat:read', onRead);
    return () => {
      socket.off('chat:delivered', onDelivered);
      socket.off('chat:read', onRead);
    };
  }, [socket, bookingId]);

  // Marks the other party's messages read while this screen is genuinely
  // open and visible - re-fires on every poll tick (cheap no-op server-side
  // if nothing's actually unread) and whenever the tab regains focus, so a
  // backgrounded tab doesn't mark messages "seen" the user never looked at.
  useEffect(() => {
    if (!socket || document.visibilityState !== 'visible') return;
    socket.emit('chat:read', { bookingId });
  }, [socket, bookingId, messages]);

  useEffect(() => {
    if (!socket) return;
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') socket.emit('chat:read', { bookingId });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [socket, bookingId]);

  // "X is typing..." indicator - the safety-net timeout clears a stuck
  // indicator if a 'typing:stop' is ever missed (dropped connection, tab
  // closed mid-type), independent of whichever stop path actually fires.
  useEffect(() => {
    if (!socket) return;
    function onStart(payload) {
      if (payload.bookingId !== bookingId) return;
      setOtherTyping(true);
      clearTimeout(typingSafetyTimerRef.current);
      typingSafetyTimerRef.current = setTimeout(() => setOtherTyping(false), TYPING_SAFETY_MS);
    }
    function onStop(payload) {
      if (payload.bookingId !== bookingId) return;
      clearTimeout(typingSafetyTimerRef.current);
      setOtherTyping(false);
    }
    socket.on('chat:typing:start', onStart);
    socket.on('chat:typing:stop', onStop);
    return () => {
      socket.off('chat:typing:start', onStart);
      socket.off('chat:typing:stop', onStop);
      clearTimeout(typingSafetyTimerRef.current);
    };
  }, [socket, bookingId]);

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

  // handleDraftChange's debounce timer is a bare setTimeout tied to input
  // events, not to an effect of its own - clear it on unmount so it can't
  // fire (and emit on a socket the component no longer cares about) after
  // the user has already navigated away.
  useEffect(() => () => clearTimeout(typingStopTimerRef.current), []);

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

  // Throttled start (at most once per TYPING_THROTTLE_MS while the user
  // keeps typing) + a debounced stop that fires after a pause in input.
  function handleDraftChange(e) {
    const value = e.target.value;
    setDraft(value);
    if (!socket) return;

    const now = Date.now();
    if (now - typingThrottleRef.current >= TYPING_THROTTLE_MS) {
      socket.emit('chat:typing:start', { bookingId });
      typingThrottleRef.current = now;
    }
    clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing:stop', { bookingId });
    }, TYPING_STOP_DEBOUNCE_MS);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setError('');
    clearTimeout(typingStopTimerRef.current);
    socket?.emit('chat:typing:stop', { bookingId });
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

  // Chat during an active job is mobile-only for a worker - same rule and
  // status set as BookingDetail.jsx's block (this screen is reachable
  // directly by URL, not just through that screen's Chat button, so it
  // needs its own guard rather than relying on that one).
  if (user.role === 'worker' && isDesktop && booking && WORKER_ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center gap-4 bg-surface-alt px-5 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-5 top-5 text-sm text-text-muted"
        >
          &larr; Back
        </button>
        <p className="max-w-sm text-base font-medium text-text-muted">{WORKER_DESKTOP_BLOCK_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-surface-alt">
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-4 lg:max-w-2xl">
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

      {error && <p className="mx-auto w-full max-w-md px-5 pt-2 text-sm text-danger lg:max-w-2xl">{error}</p>}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 py-4 lg:max-w-2xl">
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
                  <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-text-muted">
                    {formatTime(m.createdAt)}
                    {isMine && <MessageTicks message={m} />}
                  </span>
                </div>
              );
            })}
            {otherTyping && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1 rounded-2xl bg-surface-raised px-4 py-2.5 shadow-resting">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
                </div>
              </div>
            )}
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
        <div className="relative mx-auto w-full max-w-md px-5 py-3 lg:max-w-2xl">
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
              onChange={handleDraftChange}
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
