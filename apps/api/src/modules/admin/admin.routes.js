import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as adminController from './admin.controller.js';

export const adminRoutes = Router();

// Every admin route requires the admin role - this is the actual access
// control, not just a hidden UI. A non-admin (or unauthenticated request)
// gets a 403/401 here regardless of what the frontend renders.
adminRoutes.use(requireAuth, requireRole('admin'));

adminRoutes.get('/dashboard/stats', adminController.getDashboardStats);

adminRoutes.get('/approvals', adminController.getApprovalsQueue);
adminRoutes.patch('/approvals/documents/:id/approve', adminController.approveDocument);
adminRoutes.patch('/approvals/documents/:id/reject', adminController.rejectDocument);
adminRoutes.patch('/approvals/services/:id/approve', adminController.approveWorkerService);
adminRoutes.patch('/approvals/services/:id/reject', adminController.rejectWorkerService);
