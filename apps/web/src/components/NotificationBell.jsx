import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import * as notificationsApi from '../api/notifications.api.js';

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mounted once in AppShell so it's visible on every tabbed screen. The
// unread count is fetched once on mount, then kept live over the same
// socket.io connection Phase 3 set up for instant requests - no separate
// polling loop, no second real-time channel.
export function NotificationBell() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [count, setCount] = useState(0);

  useEffect(() => {
    notificationsApi
      .getUnreadCount()
      .then(({ count }) => setCount(count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onNew() {
      setCount((c) => c + 1);
    }
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-text-muted"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <BellIcon />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
