import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as usersController from './users.controller.js';

export const usersRoutes = Router();

usersRoutes.get('/me', requireAuth, usersController.getMe);
usersRoutes.patch('/me', requireAuth, usersController.updateMe);
