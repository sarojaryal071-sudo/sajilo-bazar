import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as bookingsApi from '../../api/bookings.api.js';

const POLL_MS = 3000;
const NEAR_BOTTOM_PX = 48;

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

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const prevCountRef = useRef(0);

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

  const otherName = booking && (user.role === 'worker' ? booking.customerName : booking.workerName);
  const otherImage = booking && (user.role === 'worker' ? booking.customerImageUrl : booking.workerImageUrl);

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
          <h1 className="truncate text-lg font-bold">{otherName || 'Chat'}</h1>
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
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMine ? 'bg-brand text-text-onBrand' : 'bg-surface-raised text-text shadow-resting'
                    }`}
                  >
                    {m.message}
                  </div>
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
      </div>

      <form onSubmit={handleSend} className="shrink-0 border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-md gap-2 px-5 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message"
            className="flex-1 rounded-full border border-border bg-surface-alt px-4 py-2.5 text-base outline-none focus:border-brand-solid"
          />
          <Button type="submit" className="px-5">
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
