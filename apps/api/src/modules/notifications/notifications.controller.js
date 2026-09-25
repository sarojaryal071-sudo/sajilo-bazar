import { NotificationPreferenceUpdateInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as notificationsService from './notifications.service.js';

export async function list(req, res, next) {
  try {
    const notifications = await notificationsService.listNotifications(req.user.id, req.query.unread === 'true');
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next(new ApiError(400, 'Invalid notification id'));
    const notification = await notificationsService.markAsRead(id, req.user.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const preferences = await notificationsService.getMyPreferences(req.user.id);
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

export async function updatePreference(req, res, next) {
  try {
    const input = NotificationPreferenceUpdateInputSchema.parse(req.body);
    const preferences = await notificationsService.updateMyPreference(req.user.id, input);
    res.json({ preferences });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid notification preference', err.issues) : err);
  }
}
