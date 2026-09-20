import { ApiError } from '../../middleware/error.middleware.js';
import { emitToUser } from '../../realtime/socket.js';
import * as notificationsModel from './notifications.model.js';

export async function listNotifications(userId, unreadOnly) {
  return notificationsModel.listForUser(userId, { unreadOnly });
}

export async function getUnreadCount(userId) {
  return notificationsModel.countUnread(userId);
}

export async function markAsRead(id, userId) {
  const notification = await notificationsModel.markRead(id, userId);
  if (!notification) throw new ApiError(404, 'Notification not found');
  return notification;
}

export async function markAllAsRead(userId) {
  await notificationsModel.markAllRead(userId);
}

// Called from other modules (bookings, chat) whenever something happens
// that a user should know about. Writes the durable row, then pushes it
// live over the same socket.io connection Phase 3 already set up - no
// second real-time channel. Best-effort: if the user isn't connected right
// now, the row is still there next time they open the app.
export async function notify(userId, type, payload) {
  const notification = await notificationsModel.create({ userId, type, payload });
  emitToUser(userId, 'notification:new', { notification });
  return notification;
}
