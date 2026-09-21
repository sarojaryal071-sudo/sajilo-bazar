import {
  AdminUserNotesInputSchema,
  AdminBookingCancelInputSchema,
  AdminBookingFlagInputSchema,
  AdminServiceInputSchema,
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
