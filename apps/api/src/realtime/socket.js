import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// The one piece of dedicated real-time infra PROJECT_BRIEF.md calls out as
// justified (real-time booking matching). Everything else in the app stays
// plain request/response - this stays a single small module, not a general
// "events" abstraction.

let io = null;

function userRoom(userId) {
  return `user:${userId}`;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN || true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));
  });

  return io;
}

// Pushes a real-time event to every open connection a user has (they may
// have more than one tab/device). A no-op if they're not connected right
// now - the bookings/booking_offers rows are still the source of truth for
// whenever they next load the app.
export function emitToUser(userId, event, payload) {
  io?.to(userRoom(userId)).emit(event, payload);
}
