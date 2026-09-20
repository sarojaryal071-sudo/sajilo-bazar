import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import * as notificationsApi from '../api/notifications.api.js';

// Fetched once on mount, then kept live over the same socket.io connection
// Phase 3 set up for instant requests - no separate polling loop, no second
// real-time channel. Shared by BottomNav's notifications tab.
export function useUnreadNotificationCount() {
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

  return count;
}
