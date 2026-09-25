import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import * as notificationsApi from '../api/notifications.api.js';
import { describeNotification } from '../lib/notificationText.js';

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-brand-solid">
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Home/Dashboard's single notification-related card - decided 2026-09-25,
// replaces the old pattern of surfacing an announcement directly on Home as
// a dismissible banner (see PromoBanner.jsx, which keeps that pattern but
// only for the separate merchandising promo, not personal notifications).
// This card is generic across every notification type (bookings, chat,
// announcements, disputes/support, reviews) and is never itself openable,
// readable, or dismissible - tapping it always navigates to Alerts, which
// is the only place read state is set (Notifications.jsx). With exactly
// one unread notification it previews that one; with 2+ it shows a count.
export function NotificationSummaryCard() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [unread, setUnread] = useState(null);

  useEffect(() => {
    notificationsApi
      .list({ unreadOnly: true })
      .then(({ notifications }) => setUnread(notifications))
      .catch(() => setUnread([]));
  }, []);

  // Live updates while Home/Dashboard is open (e.g. a chat message or
  // booking event arriving) - same socket connection Alerts already uses.
  useEffect(() => {
    if (!socket) return;
    function onNew({ notification }) {
      setUnread((prev) => (prev ? [notification, ...prev] : [notification]));
    }
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  if (!unread || unread.length === 0) return null;

  const { title, body } =
    unread.length === 1
      ? describeNotification(unread[0])
      : { title: `You have ${unread.length} notifications`, body: 'Tap to view them all' };

  return (
    <Card
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/notifications')}
      className="mt-4 flex cursor-pointer items-start gap-3 py-3.5"
    >
      <BellIcon />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        {body && <p className="mt-0.5 truncate text-sm text-text-muted">{body}</p>}
      </div>
    </Card>
  );
}
