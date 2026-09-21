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

adminRoutes.get('/users', adminController.listUsers);
adminRoutes.get('/users/:id', adminController.getUserDetail);
adminRoutes.patch('/users/:id/suspend', adminController.suspendUser);
adminRoutes.patch('/users/:id/reinstate', adminController.reinstateUser);
adminRoutes.patch('/users/:id/notes', adminController.setUserNotes);

adminRoutes.get('/bookings', adminController.listBookings);
adminRoutes.get('/bookings/:id', adminController.getBookingDetail);
adminRoutes.patch('/bookings/:id/cancel', adminController.cancelBooking);
adminRoutes.patch('/bookings/:id/flag', adminController.setBookingFlag);

adminRoutes.get('/categories', adminController.getCategoriesOverview);
adminRoutes.post('/services', adminController.createService);
adminRoutes.patch('/services/:id', adminController.updateService);
adminRoutes.patch('/services/:id/activate', adminController.activateService);
adminRoutes.patch('/services/:id/deactivate', adminController.deactivateService);
