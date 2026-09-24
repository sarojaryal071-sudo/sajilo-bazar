import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as trustScoreController from './trustScore.controller.js';

export const trustScoreRoutes = Router();

trustScoreRoutes.use(requireAuth, requireRole('worker'));

trustScoreRoutes.get('/me', trustScoreController.getMe);
