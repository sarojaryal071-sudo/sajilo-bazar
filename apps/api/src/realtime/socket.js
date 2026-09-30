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

export function bookingRoom(bookingId) {
  return `booking:${bookingId}`;
}

// Other modules (chat.socket.js) register additional per-connection setup
// here rather than this file importing them directly - keeps this the one
// place that owns the actual `io.on('connection', ...)` wiring, without a
// circular import back from here into a feature module.
const connectionHandlers = [];

export function onConnection(handler) {
  connectionHandlers.push(handler);
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
    for (const handler of connectionHandlers) handler(socket);
  });

  return io;
}

// Whether any of userId's open sockets is currently sitting in this
// booking's chat room - chat.service.js's proxy for "delivered" (message
// content itself still only reaches a client via its own poll, not a
// push, but "connected to this room right now" is a reasonable stand-in
// for "will see it imminently").
export function isUserInBookingRoom(userId, bookingId) {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(bookingRoom(bookingId));
  if (!room) return false;
  for (const socketId of room) {
    if (io.sockets.sockets.get(socketId)?.userId === userId) return true;
  }
  return false;
}

// Pushes a real-time event to every open connection a user has (they may
// have more than one tab/device). A no-op if they're not connected right
// now - the bookings/booking_offers rows are still the source of truth for
// whenever they next load the app.
export function emitToUser(userId, event, payload) {
  io?.to(userRoom(userId)).emit(event, payload);
}

// Same idea as emitToUser, but for an arbitrary room rather than one
// user's own room - the generic primitive emitToUser is really a special
// case of. First real caller is supportChat.socket.js's admin-list and
// per-ticket rooms (Phase 3, 2026-09-30), which aren't "one user's" rooms.
export function emitToRoom(room, event, payload) {
  io?.to(room).emit(event, payload);
}
