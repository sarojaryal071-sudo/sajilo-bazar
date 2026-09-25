import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as publicationsController from './publications.controller.js';

export const publicationsRoutes = Router();

// Customer/worker-facing read of live promotions (Home/Dashboard carousel).
// Any authenticated user can read the audience they're asking for -
// there's nothing sensitive in a published promotion.
publicationsRoutes.get('/active', requireAuth, publicationsController.getActivePromotions);
