import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as usersController from './users.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const usersRoutes = Router();

usersRoutes.get('/me', requireAuth, usersController.getMe);
usersRoutes.patch('/me', requireAuth, usersController.updateMe);
usersRoutes.post('/me/photo', requireAuth, upload.single('photo'), usersController.uploadPhoto);
usersRoutes.post('/me/support-tickets', requireAuth, usersController.createSupportTicket);
