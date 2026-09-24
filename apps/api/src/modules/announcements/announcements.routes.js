import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as announcementsController from './announcements.controller.js';

export const announcementsRoutes = Router();

// Customer/worker-facing read of the same content_items table the admin
// Announcements screen manages (Round D) - the Home promo banner. Any
// authenticated user can read the audience they're asking for; there's
// nothing sensitive in a published announcement.
announcementsRoutes.get('/active', requireAuth, announcementsController.getActive);
