import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { getToken } from '../api/client.js';

// Vite's dev proxy only forwards /api (see vite.config.js) - socket.io's
// own path isn't proxied, so this talks to the API's origin directly. In
// production VITE_API_URL is already the API's real origin.
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const SocketContext = createContext(null);

// One socket connection per logged-in session, established once here and
// reused across every screen - not per-component - so a worker keeps
// receiving instant-request offers regardless of which tab they're on.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) {
      setSocket(null);
      return;
    }

    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);

    return () => {
      s.close();
    };
  }, [user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

// Returns the shared socket, or null if not connected yet (or logged out) -
// callers should guard against null rather than assume it's always ready.
export function useSocket() {
  return useContext(SocketContext);
}
