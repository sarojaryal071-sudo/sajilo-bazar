import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import * as notificationsApi from '../../api/notifications.api.js';
import { describeNotification } from '../../lib/notificationText.js';
import { timeAgo } from '../../lib/timeAgo.js';

export function Notifications() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    notificationsApi
      .list()
      .then(({ notifications }) => setNotifications(notifications))
      .catch((err) => setError(err.message));
  }, []);

  // New notifications pushed while the inbox is open (e.g. a chat message
  // arriving) - same socket connection Phase 3 already set up.
  useEffect(() => {
    if (!socket) return;
    function onNew({ notification }) {
      setNotifications((prev) => (prev ? [notification, ...prev] : [notification]));
    }
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  function handleTap(notification) {
    if (!notification.readAt) {
      notificationsApi.markRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    }
    if (notification.payload?.bookingId) {
      navigate(`/booking/${notification.payload.bookingId}`);
    }
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  const hasUnread = notifications?.some((n) => !n.readAt);

  return (
    <Screen>
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-text-muted">
          &larr; Back
        </button>
        {hasUnread && (
          <button onClick={handleMarkAllRead} className="text-sm font-medium text-brand-solid">
            Mark all read
          </button>
        )}
      </div>
      <h1 className="mt-4 text-2xl font-bold">Notifications</h1>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {notifications === null && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {notifications?.length === 0 && <p className="mt-4 text-sm text-text-muted">No notifications yet.</p>}

      <div className="mt-4 flex flex-col gap-2">
        {notifications?.map((n) => {
          const { title, body } = describeNotification(n);
          return (
            <Card
              key={n.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTap(n)}
              className={`cursor-pointer py-3 ${!n.readAt ? 'ring-1 ring-brand-solid' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm ${!n.readAt ? 'font-semibold' : 'font-medium text-text-muted'}`}>
                    {title}
                  </p>
                  {body && <p className="mt-0.5 truncate text-sm text-text-muted">{body}</p>}
                </div>
                <span className="shrink-0 text-xs text-text-muted">{timeAgo(n.createdAt)}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </Screen>
  );
}
