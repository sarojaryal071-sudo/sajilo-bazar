import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Button } from '../../components/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as bookingsApi from '../../api/bookings.api.js';

const POLL_MS = 3000;

export function BookingChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setError('');
    try {
      const { message } = await bookingsApi.sendMessage(id, text);
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err.message);
    }
  }

  const otherName = booking && (user.role === 'worker' ? booking.customerName : booking.workerName);

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-text-muted" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-lg font-bold">{otherName || 'Chat'}</h1>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {messages.length === 0 && <p className="text-sm text-text-muted">No messages yet - say hello.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
              m.senderId === user.id
                ? 'self-end bg-brand text-text-onBrand'
                : 'self-start bg-surface-alt text-text'
            }`}
          >
            {m.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-base outline-none focus:border-brand-solid"
        />
        <Button type="submit" className="px-5">
          Send
        </Button>
      </form>
    </Screen>
  );
}
