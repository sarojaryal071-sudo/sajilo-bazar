import { onConnection, emitToUser, bookingRoom } from '../../realtime/socket.js';
import * as chatService from './chat.service.js';

// Typing indicator + delivered/seen ticks for booking chat (2026-09-27).
// Message content itself still travels over plain HTTP + BookingChat.jsx's
// existing 3s poll - this only carries the presence/status signals a poll
// can't deliver promptly: typing start/stop, and delivery/read receipts
// pushed straight to the OTHER party's open connection(s).
//
// Call once from server.js, after initSocket() - registers via
// onConnection() rather than this file reaching into realtime/socket.js's
// io.on('connection', ...) directly, so there's no import cycle back from
// socket.js into a feature module.
export function registerChatSocket() {
  onConnection((socket) => {
    // Joining is how a socket becomes "present" in a booking's chat for
    // the delivered-tick proxy (see chat.service.js isUserInBookingRoom
    // usage) - also catches up any messages that arrived while this user
    // wasn't connected to the room.
    socket.on('chat:join', async ({ bookingId } = {}) => {
      if (!Number.isInteger(bookingId)) return;
      try {
        const { messageIds, otherPartyId } = await chatService.markDeliveredOnJoin(bookingId, socket.userId);
        socket.join(bookingRoom(bookingId));
        if (messageIds.length > 0 && otherPartyId) {
          emitToUser(otherPartyId, 'chat:delivered', {
            bookingId,
            messageIds,
            deliveredAt: new Date().toISOString(),
          });
        }
      } catch {
        // Not a participant of this booking (or it doesn't exist) - don't
        // join the room, and don't leak which case it was.
      }
    });

    socket.on('chat:leave', ({ bookingId } = {}) => {
      if (Number.isInteger(bookingId)) socket.leave(bookingRoom(bookingId));
    });

    // Emitted by the client while the chat screen is actually open/in view
    // (not just connected) - see BookingChat.jsx's read-marking effect.
    socket.on('chat:read', async ({ bookingId } = {}) => {
      if (!Number.isInteger(bookingId)) return;
      try {
        const { messageIds, otherPartyId } = await chatService.markAsRead(bookingId, socket.userId);
        if (messageIds.length > 0 && otherPartyId) {
          emitToUser(otherPartyId, 'chat:read', { bookingId, messageIds, readAt: new Date().toISOString() });
        }
      } catch {
        // Not a participant - ignore.
      }
    });

    // Typing is ephemeral presence, not durable state - a plain room
    // broadcast (reaches only sockets currently joined to this booking's
    // chat, i.e. the other party with the screen open) rather than a DB
    // round trip to resolve who the other party is on every keystroke.
    socket.on('chat:typing:start', ({ bookingId } = {}) => {
      if (Number.isInteger(bookingId)) {
        socket.to(bookingRoom(bookingId)).emit('chat:typing:start', { bookingId, userId: socket.userId });
      }
    });

    socket.on('chat:typing:stop', ({ bookingId } = {}) => {
      if (Number.isInteger(bookingId)) {
        socket.to(bookingRoom(bookingId)).emit('chat:typing:stop', { bookingId, userId: socket.userId });
      }
    });
  });
}
