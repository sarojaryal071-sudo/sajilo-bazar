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
adminRoutes.patch('/services/:id/mark-high-risk', adminController.markServiceHighRisk);
adminRoutes.patch('/services/:id/unmark-high-risk', adminController.unmarkServiceHighRisk);

adminRoutes.get('/disputes', adminController.listDisputes);
adminRoutes.get('/disputes/:id', adminController.getDisputeDetail);
adminRoutes.post('/disputes', adminController.createDispute);
adminRoutes.patch('/disputes/:id/resolve', adminController.resolveDispute);

adminRoutes.get('/support-tickets', adminController.listSupportTickets);
adminRoutes.get('/support-tickets/:id', adminController.getSupportTicketDetail);
adminRoutes.post('/support-tickets', adminController.createSupportTicket);
adminRoutes.post('/support-tickets/:id/messages', adminController.replyToTicket);
adminRoutes.patch('/support-tickets/:id/status', adminController.setTicketStatus);

adminRoutes.get('/publications', adminController.listPublications);
adminRoutes.get('/publications/:id', adminController.getPublication);
adminRoutes.post('/publications', adminController.createPublication);
adminRoutes.patch('/publications/:id', adminController.updatePublication);
adminRoutes.patch('/publications/:id/publish', adminController.publishPublication);
adminRoutes.patch('/publications/:id/unpublish', adminController.unpublishPublication);

adminRoutes.get('/policies', adminController.listPolicies);
adminRoutes.get('/policies/:policyType', adminController.getPolicy);
adminRoutes.patch('/policies/:policyType', adminController.updatePolicy);
adminRoutes.patch('/policies/:policyType/publish', adminController.publishPolicy);
adminRoutes.patch('/policies/:policyType/unpublish', adminController.unpublishPolicy);
