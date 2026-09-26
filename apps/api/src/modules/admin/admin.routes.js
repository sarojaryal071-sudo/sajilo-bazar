import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { requireDepartment, requireSuperAdmin } from './adminAccess.middleware.js';
import * as adminController from './admin.controller.js';

export const adminRoutes = Router();

// Every admin route requires the admin role - this is the actual access
// control, not just a hidden UI. A non-admin (or unauthenticated request)
// gets a 403/401 here regardless of what the frontend renders. Department
// gating (requireDepartment/requireSuperAdmin below) is a second, finer-
// grained layer on top of this - it decides which admin/staff accounts can
// reach which route groups, same "cosmetic frontend, real backend gate"
// principle AdminShell.jsx's comment already documents for the role check.
adminRoutes.use(requireAuth, requireRole('admin'));

// Overview: everyone with any admin role reaches Dashboard - no department
// gate. Analytics is a Super-Admin-only tab on that same page; moving its
// location onto Dashboard didn't change its access control.
adminRoutes.get('/dashboard/stats', adminController.getDashboardStats);
adminRoutes.get('/analytics', requireSuperAdmin, adminController.getAnalytics);

// Settings (platform_settings, commission rate, search radius, etc.) is a
// plain standalone top-level link, Super Admin only.
adminRoutes.get('/accounting/summary', requireDepartment('finance'), adminController.getAccountingSummary);

adminRoutes.get('/approvals', requireDepartment('people_content'), adminController.getApprovalsQueue);
adminRoutes.patch(
  '/approvals/documents/:id/approve',
  requireDepartment('people_content'),
  adminController.approveDocument
);
adminRoutes.patch(
  '/approvals/documents/:id/reject',
  requireDepartment('people_content'),
  adminController.rejectDocument
);
adminRoutes.patch(
  '/approvals/services/:id/approve',
  requireDepartment('people_content'),
  adminController.approveWorkerService
);
adminRoutes.patch(
  '/approvals/services/:id/reject',
  requireDepartment('people_content'),
  adminController.rejectWorkerService
);

// Users: People & Content owns it (create/edit actions below), but Support
// gets the one deliberate cross-department exception - read-only access,
// so a Support agent can check a profile/history while working a dispute
// or ticket. The mutating actions (suspend/reinstate/notes) stay People &
// Content-only, gated separately below.
adminRoutes.get('/users', requireDepartment('people_content', 'support'), adminController.listUsers);
adminRoutes.get('/users/:id', requireDepartment('people_content', 'support'), adminController.getUserDetail);
adminRoutes.patch('/users/:id/suspend', requireDepartment('people_content'), adminController.suspendUser);
adminRoutes.patch('/users/:id/reinstate', requireDepartment('people_content'), adminController.reinstateUser);
adminRoutes.patch('/users/:id/notes', requireDepartment('people_content'), adminController.setUserNotes);

adminRoutes.get('/bookings', requireDepartment('operations'), adminController.listBookings);
adminRoutes.get('/bookings/:id', requireDepartment('operations'), adminController.getBookingDetail);
adminRoutes.patch('/bookings/:id/cancel', requireDepartment('operations'), adminController.cancelBooking);
adminRoutes.patch('/bookings/:id/flag', requireDepartment('operations'), adminController.setBookingFlag);

adminRoutes.get('/categories', requireDepartment('people_content'), adminController.getCategoriesOverview);
adminRoutes.post('/services', requireDepartment('people_content'), adminController.createService);
adminRoutes.patch('/services/:id', requireDepartment('people_content'), adminController.updateService);
adminRoutes.patch('/services/:id/activate', requireDepartment('people_content'), adminController.activateService);
adminRoutes.patch(
  '/services/:id/deactivate',
  requireDepartment('people_content'),
  adminController.deactivateService
);
adminRoutes.patch(
  '/services/:id/mark-high-risk',
  requireDepartment('people_content'),
  adminController.markServiceHighRisk
);
adminRoutes.patch(
  '/services/:id/unmark-high-risk',
  requireDepartment('people_content'),
  adminController.unmarkServiceHighRisk
);

// Disputes/support tickets: any of the four departments can reach the
// route (their own queue is whatever's currently tagged with a department
// they hold - see admin.service.js's department filtering); a Super Admin
// sees every department's queue. Escalating just needs the same access a
// read already requires - no extra restriction beyond that, matching the
// "manual only" simplicity of the rest of this feature.
const ANY_DEPARTMENT = ['support', 'finance', 'operations', 'people_content'];
adminRoutes.get('/disputes', requireDepartment(...ANY_DEPARTMENT), adminController.listDisputes);
adminRoutes.get('/disputes/:id', requireDepartment(...ANY_DEPARTMENT), adminController.getDisputeDetail);
adminRoutes.post('/disputes', requireDepartment(...ANY_DEPARTMENT), adminController.createDispute);
adminRoutes.patch('/disputes/:id/resolve', requireDepartment(...ANY_DEPARTMENT), adminController.resolveDispute);
adminRoutes.patch('/disputes/:id/escalate', requireDepartment(...ANY_DEPARTMENT), adminController.escalateDispute);

adminRoutes.get('/support-tickets', requireDepartment(...ANY_DEPARTMENT), adminController.listSupportTickets);
adminRoutes.get(
  '/support-tickets/:id',
  requireDepartment(...ANY_DEPARTMENT),
  adminController.getSupportTicketDetail
);
adminRoutes.post('/support-tickets', requireDepartment(...ANY_DEPARTMENT), adminController.createSupportTicket);
adminRoutes.post(
  '/support-tickets/:id/messages',
  requireDepartment(...ANY_DEPARTMENT),
  adminController.replyToTicket
);
adminRoutes.patch(
  '/support-tickets/:id/status',
  requireDepartment(...ANY_DEPARTMENT),
  adminController.setTicketStatus
);
adminRoutes.patch(
  '/support-tickets/:id/escalate',
  requireDepartment(...ANY_DEPARTMENT),
  adminController.escalateTicket
);

adminRoutes.get('/publications', requireDepartment('people_content'), adminController.listPublications);
adminRoutes.get('/publications/:id', requireDepartment('people_content'), adminController.getPublication);
adminRoutes.post('/publications', requireDepartment('people_content'), adminController.createPublication);
adminRoutes.patch('/publications/:id', requireDepartment('people_content'), adminController.updatePublication);
adminRoutes.patch(
  '/publications/:id/publish',
  requireDepartment('people_content'),
  adminController.publishPublication
);
adminRoutes.patch(
  '/publications/:id/unpublish',
  requireDepartment('people_content'),
  adminController.unpublishPublication
);

adminRoutes.get('/policies', requireDepartment('people_content'), adminController.listPolicies);
adminRoutes.get('/policies/:policyType', requireDepartment('people_content'), adminController.getPolicy);
adminRoutes.patch('/policies/:policyType', requireDepartment('people_content'), adminController.updatePolicy);
adminRoutes.patch(
  '/policies/:policyType/publish',
  requireDepartment('people_content'),
  adminController.publishPolicy
);
adminRoutes.patch(
  '/policies/:policyType/unpublish',
  requireDepartment('people_content'),
  adminController.unpublishPolicy
);

// Staff: Super Admin only, both viewing and managing - this is the screen
// that grants everyone else's department access, so it can't itself be
// department-gated (a People & Content grant would let a staffer grant
// themselves Super Admin).
adminRoutes.get('/staff', requireSuperAdmin, adminController.listStaff);
adminRoutes.get('/staff/:id', requireSuperAdmin, adminController.getStaffDetail);
adminRoutes.post('/staff', requireSuperAdmin, adminController.createStaff);
adminRoutes.patch('/staff/:id/access', requireSuperAdmin, adminController.updateStaffAccess);
