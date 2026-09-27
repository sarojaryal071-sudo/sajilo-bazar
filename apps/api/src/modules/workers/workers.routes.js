import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, requireApprovedWorker } from '../../middleware/auth.middleware.js';
import * as workersController from './workers.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const workersRoutes = Router();

workersRoutes.get('/catalog/services', workersController.getServiceCatalog);
workersRoutes.get('/search', workersController.search);
workersRoutes.get('/me', requireAuth, requireRole('worker'), workersController.getMe);
workersRoutes.patch('/me/welcome', requireAuth, requireRole('worker'), workersController.ackWelcome);
workersRoutes.post(
  '/me/services',
  requireAuth,
  requireApprovedWorker,
  upload.single('document'),
  workersController.addService
);
workersRoutes.patch('/me/description', requireAuth, requireApprovedWorker, workersController.updateDescription);
workersRoutes.get('/me/portfolio', requireAuth, requireApprovedWorker, workersController.listPortfolio);
workersRoutes.post(
  '/me/portfolio',
  requireAuth,
  requireApprovedWorker,
  upload.array('images', 6),
  workersController.createPortfolioItem
);
workersRoutes.patch(
  '/me/portfolio/:id',
  requireAuth,
  requireApprovedWorker,
  upload.array('images', 6),
  workersController.updatePortfolioItem
);
workersRoutes.delete('/me/portfolio/:id', requireAuth, requireApprovedWorker, workersController.deletePortfolioItem);
workersRoutes.put(
  '/me/portfolio/reorder',
  requireAuth,
  requireApprovedWorker,
  workersController.reorderPortfolio
);
workersRoutes.patch('/me/online', requireAuth, requireApprovedWorker, workersController.setOnline);
workersRoutes.get('/me/availability', requireAuth, requireApprovedWorker, workersController.getAvailability);
workersRoutes.put('/me/availability', requireAuth, requireApprovedWorker, workersController.setAvailability);
workersRoutes.patch(
  '/me/response-time',
  requireAuth,
  requireApprovedWorker,
  workersController.setTypicalResponseHours
);
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

// Must stay last - a generic :id param route would otherwise shadow the
// specific paths above (/search, /me, /catalog/services).
workersRoutes.get('/:id', workersController.getDetail);
