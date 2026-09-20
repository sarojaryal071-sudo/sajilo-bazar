import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as commissionLedgerController from './commissionLedger.controller.js';

export const commissionLedgerRoutes = Router();

commissionLedgerRoutes.use(requireAuth, requireRole('worker'));

commissionLedgerRoutes.get('/me', commissionLedgerController.getMyLedger);
