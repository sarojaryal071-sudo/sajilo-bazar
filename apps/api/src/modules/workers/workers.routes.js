import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as workersController from './workers.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const workersRoutes = Router();

workersRoutes.get('/catalog/services', workersController.getServiceCatalog);
workersRoutes.get('/me', requireAuth, requireRole('worker'), workersController.getMe);
workersRoutes.post(
  '/apply',
  requireAuth,
  requireRole('worker'),
  upload.fields([
    { name: 'citizenship', maxCount: 1 },
    { name: 'certificate', maxCount: 1 },
  ]),
  workersController.apply
);
