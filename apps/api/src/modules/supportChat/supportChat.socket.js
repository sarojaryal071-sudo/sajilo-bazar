import { onConnection, emitToRoom } from '../../realtime/socket.js';

// Real-time layer for the admin Live Chat console (target-spec Phase 3) -
// deliberately NOT a new chat data model. It's the same support_tickets/
// support_ticket_messages tables the existing async Support Tickets screen
// already reads and writes (see admin.model.js/admin.service.js); this
// module only adds push delivery on top, the same "sockets carry presence/
// push, message content travels over plain HTTP" split chat.socket.js
// already established for booking chat.
//
// Two kinds of room:
// - ADMIN_LIST_ROOM: any staff member with the Live Chat console open,
//   so the conversation list can update live (a new active ticket
//   appearing, one leaving the active set on resolve/close) without a
//   manual refresh.
// - a per-ticket room: staff currently viewing one specific thread, so a
//   reply posted by another staff member (or, if a customer/worker-side
//   live-reply UI is ever built, by them) appears without a refresh.

const ADMIN_LIST_ROOM = 'support-chat:admins';

function ticketRoom(ticketId) {
  return `support-chat:ticket:${ticketId}`;
}

// Call once from server.js, after initSocket() - same registration
// pattern as chat.socket.js's registerChatSocket().
export function registerSupportChatSocket() {
  onConnection((socket) => {
    socket.on('supportchat:join-list', () => {
      socket.join(ADMIN_LIST_ROOM);
    });
    socket.on('supportchat:leave-list', () => {
      socket.leave(ADMIN_LIST_ROOM);
    });
    socket.on('supportchat:join', ({ ticketId } = {}) => {
      if (Number.isInteger(ticketId)) socket.join(ticketRoom(ticketId));
    });
    socket.on('supportchat:leave', ({ ticketId } = {}) => {
      if (Number.isInteger(ticketId)) socket.leave(ticketRoom(ticketId));
    });
  });
}

// Called from users.service.js (a new ticket opened) and
// admin.service.js (status changed) - anything that should refresh the
// conversation list for every staff member currently watching it.
export function broadcastTicketListEvent(event, payload) {
  emitToRoom(ADMIN_LIST_ROOM, event, payload);
}

// Called from admin.service.js's replyToTicket - pushes the new message to
// anyone with that specific ticket's thread open.
export function broadcastTicketMessage(ticketId, payload) {
  emitToRoom(ticketRoom(ticketId), 'supportchat:message', payload);
}
