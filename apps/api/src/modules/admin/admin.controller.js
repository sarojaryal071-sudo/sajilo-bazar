import {
  AdminUserNotesInputSchema,
  AdminBookingCancelInputSchema,
  AdminBookingFlagInputSchema,
  AdminServiceInputSchema,
  AdminDisputeCreateInputSchema,
  AdminDisputeResolveInputSchema,
  AdminSupportTicketCreateInputSchema,
  AdminSupportTicketReplyInputSchema,
  AdminSupportTicketStatusInputSchema,
  AdminAnnouncementInputSchema,
  AdminPolicyInputSchema,
} from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as adminService from './admin.service.js';

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getApprovalsQueue(req, res, next) {
  try {
    const queue = await adminService.getApprovalsQueue();
    res.json({ queue });
  } catch (err) {
    next(err);
  }
}

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid id');
  return id;
}

export async function approveDocument(req, res, next) {
  try {
    const document = await adminService.decideDocument(parseId(req), req.user.id, 'approve');
    res.json({ document });
  } catch (err) {
    next(err);
  }
}

export async function rejectDocument(req, res, next) {
  try {
    const document = await adminService.decideDocument(parseId(req), req.user.id, 'reject');
    res.json({ document });
  } catch (err) {
    next(err);
  }
}

export async function approveWorkerService(req, res, next) {
  try {
    const service = await adminService.decideWorkerService(parseId(req), req.user.id, 'approve');
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

export async function rejectWorkerService(req, res, next) {
  try {
    const service = await adminService.decideWorkerService(parseId(req), req.user.id, 'reject');
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

// ---- Users ----

export async function listUsers(req, res, next) {
  try {
    const { role, status, q } = req.query;
    const users = await adminService.listUsers({ role, status, q });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req, res, next) {
  try {
    const detail = await adminService.getUserDetail(parseId(req));
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const user = await adminService.suspendUser(parseId(req));
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function reinstateUser(req, res, next) {
  try {
    const user = await adminService.reinstateUser(parseId(req));
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function setUserNotes(req, res, next) {
  try {
    const { notes } = AdminUserNotesInputSchema.parse(req.body);
    const user = await adminService.setUserNotes(parseId(req), notes);
    res.json({ user });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid notes', err.issues) : err);
  }
}

// ---- Bookings ----

export async function listBookings(req, res, next) {
  try {
    const { status, type, from, to } = req.query;
    const bookings = await adminService.listBookings({ status, type, from, to });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

export async function getBookingDetail(req, res, next) {
  try {
    const detail = await adminService.getBookingDetail(parseId(req));
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { reason } = AdminBookingCancelInputSchema.parse(req.body);
    const booking = await adminService.adminCancelBooking(parseId(req), req.user.id, reason);
    res.json({ booking });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid cancellation', err.issues) : err);
  }
}

export async function setBookingFlag(req, res, next) {
  try {
    const input = AdminBookingFlagInputSchema.parse(req.body);
    const booking = await adminService.setBookingFlag(parseId(req), input);
    res.json({ booking });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid flag input', err.issues) : err);
  }
}

// ---- Categories/Services ----

export async function getCategoriesOverview(req, res, next) {
  try {
    const categories = await adminService.getCategoriesOverview();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createService(req, res, next) {
  try {
    const input = AdminServiceInputSchema.parse(req.body);
    const service = await adminService.createService(input);
    res.status(201).json({ service });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid service input', err.issues) : err);
  }
}

export async function updateService(req, res, next) {
  try {
    const input = AdminServiceInputSchema.parse(req.body);
    const service = await adminService.updateService(parseId(req), input);
    res.json({ service });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid service input', err.issues) : err);
  }
}

export async function activateService(req, res, next) {
  try {
    const service = await adminService.setServiceActive(parseId(req), true);
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

export async function deactivateService(req, res, next) {
  try {
    const service = await adminService.setServiceActive(parseId(req), false);
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

// ---- Disputes ----

export async function listDisputes(req, res, next) {
  try {
    const { status } = req.query;
    const disputes = await adminService.listDisputes({ status });
    res.json({ disputes });
  } catch (err) {
    next(err);
  }
}

export async function getDisputeDetail(req, res, next) {
  try {
    const detail = await adminService.getDisputeDetail(parseId(req));
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function createDispute(req, res, next) {
  try {
    const input = AdminDisputeCreateInputSchema.parse(req.body);
    const dispute = await adminService.createDispute(input);
    res.status(201).json({ dispute });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid dispute input', err.issues) : err);
  }
}

export async function resolveDispute(req, res, next) {
  try {
    const input = AdminDisputeResolveInputSchema.parse(req.body);
    const dispute = await adminService.resolveDispute(parseId(req), req.user.id, input);
    res.json({ dispute });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid resolution input', err.issues) : err);
  }
}

// ---- Support tickets ----

export async function listSupportTickets(req, res, next) {
  try {
    const { status, priority, q } = req.query;
    const tickets = await adminService.listSupportTickets({ status, priority, q });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

export async function getSupportTicketDetail(req, res, next) {
  try {
    const detail = await adminService.getSupportTicketDetail(parseId(req));
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function createSupportTicket(req, res, next) {
  try {
    const input = AdminSupportTicketCreateInputSchema.parse(req.body);
    const ticket = await adminService.createSupportTicket(input);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid ticket input', err.issues) : err);
  }
}

export async function replyToTicket(req, res, next) {
  try {
    const { message } = AdminSupportTicketReplyInputSchema.parse(req.body);
    const messages = await adminService.replyToTicket(parseId(req), req.user.id, message);
    res.status(201).json({ messages });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid message', err.issues) : err);
  }
}

export async function setTicketStatus(req, res, next) {
  try {
    const { status } = AdminSupportTicketStatusInputSchema.parse(req.body);
    const ticket = await adminService.setTicketStatus(parseId(req), status);
    res.json({ ticket });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid status', err.issues) : err);
  }
}

// ---- Announcements ----

export async function listAnnouncements(req, res, next) {
  try {
    const { status, audience } = req.query;
    const announcements = await adminService.listAnnouncements({ status, audience });
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
}

export async function getAnnouncement(req, res, next) {
  try {
    const announcement = await adminService.getAnnouncement(parseId(req));
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const input = AdminAnnouncementInputSchema.parse(req.body);
    const announcement = await adminService.createAnnouncement(input, req.user.id);
    res.status(201).json({ announcement });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid announcement input', err.issues) : err);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const input = AdminAnnouncementInputSchema.parse(req.body);
    const announcement = await adminService.updateAnnouncement(parseId(req), input);
    res.json({ announcement });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid announcement input', err.issues) : err);
  }
}

export async function publishAnnouncement(req, res, next) {
  try {
    const announcement = await adminService.setAnnouncementStatus(parseId(req), 'published');
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function unpublishAnnouncement(req, res, next) {
  try {
    const announcement = await adminService.setAnnouncementStatus(parseId(req), 'unpublished');
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
}

// ---- Policies ----

const POLICY_TYPES = ['terms_of_service', 'privacy_policy', 'community_guidelines'];

function parsePolicyType(req) {
  const { policyType } = req.params;
  if (!POLICY_TYPES.includes(policyType)) throw new ApiError(400, 'Invalid policy type');
  return policyType;
}

export async function listPolicies(req, res, next) {
  try {
    const policies = await adminService.listPolicies();
    res.json({ policies });
  } catch (err) {
    next(err);
  }
}

export async function getPolicy(req, res, next) {
  try {
    const policy = await adminService.getPolicy(parsePolicyType(req));
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

export async function updatePolicy(req, res, next) {
  try {
    const input = AdminPolicyInputSchema.parse(req.body);
    const policy = await adminService.updatePolicy(parsePolicyType(req), input);
    res.json({ policy });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid policy input', err.issues) : err);
  }
}

export async function publishPolicy(req, res, next) {
  try {
    const policy = await adminService.setPolicyStatus(parsePolicyType(req), 'published');
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

export async function unpublishPolicy(req, res, next) {
  try {
    const policy = await adminService.setPolicyStatus(parsePolicyType(req), 'unpublished');
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}
