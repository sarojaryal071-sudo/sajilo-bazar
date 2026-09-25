import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as addressesController from './addresses.controller.js';

export const addressesRoutes = Router();

// Customer-only - workers don't have saved addresses (see docs/SCREENS.md).
addressesRoutes.use(requireAuth, requireRole('customer'));

addressesRoutes.get('/me', addressesController.list);
addressesRoutes.post('/me', addressesController.create);
addressesRoutes.patch('/me/:id', addressesController.update);
addressesRoutes.delete('/me/:id', addressesController.remove);
addressesRoutes.post('/me/:id/default', addressesController.setDefault);
