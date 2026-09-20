import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as notificationsController from './notifications.controller.js';

export const notificationsRoutes = Router();

notificationsRoutes.use(requireAuth);

notificationsRoutes.get('/', notificationsController.list);
notificationsRoutes.get('/unread-count', notificationsController.unreadCount);
notificationsRoutes.patch('/read-all', notificationsController.markAllRead);
notificationsRoutes.patch('/:id/read', notificationsController.markRead);
