import { NOTIFICATION_CATEGORIES, NOTIFICATION_TYPE_CATEGORY } from '@sajilo-bazar/shared';
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
//
// Gated by Settings -> Notifications -> the type's matrix category (see
// NOTIFICATION_TYPE_CATEGORY) - a category with its In-app column off
// suppresses the notification entirely (no row written, nothing pushed),
// rather than writing a row the user asked not to see.
export async function notify(userId, type, payload) {
  const category = NOTIFICATION_TYPE_CATEGORY[type];
  if (category) {
    const allowed = await notificationsModel.isCategoryAllowed(userId, category);
    if (!allowed) return null;
  }
  const notification = await notificationsModel.create({ userId, type, payload });
  emitToUser(userId, 'notification:new', { notification });
  return notification;
}

// Every category defaults to true (on) unless the user has explicitly
// toggled it off - see notification_preferences migration.
export async function getMyPreferences(userId) {
  const overrides = await notificationsModel.listPreferenceOverrides(userId);
  const preferences = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, true]));
  for (const { category, inApp } of overrides) preferences[category] = inApp;
  return preferences;
}

export async function updateMyPreference(userId, { category, inApp }) {
  await notificationsModel.setPreference(userId, category, inApp);
  return getMyPreferences(userId);
}
