import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from './admin.model.js';
import * as workersModel from '../workers/workers.model.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as chatModel from '../chat/chat.model.js';
import * as commissionLedgerModel from '../commissionLedger/commissionLedger.model.js';
import { notify } from '../notifications/notifications.service.js';

export async function getDashboardStats() {
  return adminModel.getDashboardStats();
}

export async function getApprovalsQueue() {
  const [documents, services] = await Promise.all([
    adminModel.listPendingDocuments(),
    adminModel.listPendingServices(),
  ]);
  return [...documents, ...services].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// Approving a document only flips the worker's overall verification_status
// once every one of their documents has been approved - a worker who
// uploaded two documents isn't bookable just because the first one cleared.
// Rejecting is immediate: one rejected document means the application needs
// to be redone, same as the existing reapply flow already assumes.
export async function decideDocument(documentId, adminId, decision) {
  const doc = await adminModel.findDocumentById(documentId);
  if (!doc) throw new ApiError(404, 'Document not found');
  if (doc.status !== 'pending') throw new ApiError(400, 'This document has already been reviewed');

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const updated = await adminModel.decideDocument(documentId, { status, adminId });

  if (status === 'rejected') {
    await adminModel.setWorkerVerificationStatus(doc.worker_id, 'rejected');
  } else {
    const stillPending = await adminModel.countPendingDocumentsForWorker(doc.worker_id);
    if (stillPending === 0) {
      await adminModel.setWorkerVerificationStatus(doc.worker_id, 'approved');
    }
  }

  return updated;
}

export async function decideWorkerService(serviceId, adminId, decision) {
  const service = await adminModel.findWorkerServiceById(serviceId);
  if (!service) throw new ApiError(404, 'Service not found');
  if (service.approval_status !== 'pending') {
    throw new ApiError(400, 'This service has already been reviewed');
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  return adminModel.decideWorkerService(serviceId, { status, adminId });
}

// ---- Users (Round A) ----

export async function listUsers(filters) {
  return adminModel.listUsers(filters);
}

// Worker-specific info only attached for role = 'worker' - a customer or
// admin account has no worker_profiles row to join against.
export async function getUserDetail(id) {
  const user = await adminModel.findUserDetail(id);
  if (!user) throw new ApiError(404, 'User not found');

  const bookings = await adminModel.listBookingsForUser(id);

  let worker = null;
  if (user.role === 'worker') {
    const [profile, services, documents, reviewData] = await Promise.all([
      workersModel.findProfile(id),
      workersModel.listWorkerServices(id),
      workersModel.listDocuments(id),
      workersModel.findReviewsForWorker(id),
    ]);
    worker = { profile, services, documents, reviewsCount: reviewData.reviewsCount };
  }

  return { user, worker, bookings };
}

// Judgment call: admin accounts can't be suspended from this screen - with
// no Staff/roles screen yet (that's Round E), there'd be no way back in if
// an admin locked out the only other admin (or themselves) by mistake.
export async function suspendUser(id) {
  const user = await adminModel.findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be suspended from here');
  return adminModel.setUserModerationStatus(id, 'suspended');
}

export async function reinstateUser(id) {
  const user = await adminModel.findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return adminModel.setUserModerationStatus(id, 'active');
}

export async function setUserNotes(id, notes) {
  const user = await adminModel.findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return adminModel.setUserAdminNotes(id, notes);
}

// ---- Bookings (Round A) ----

export async function listBookings(filters) {
  return adminModel.listBookingsAdmin(filters);
}

// Reuses bookings.model.js's own composed booking shape (services, party
// names) rather than re-deriving it - the admin view is the same booking,
// just with two more panels (chat transcript, commission entry) attached.
// "Full status timeline" is necessarily just what the schema actually
// tracks - created_at and completed_at, plus cancelled_by/cancel_reason
// when applicable. There's no separate per-transition timestamp log (no
// accepted_at/started_at columns exist), so accept/start times aren't
// shown because they aren't recorded anywhere.
export async function getBookingDetail(id) {
  const booking = await bookingsModel.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');

  const [messages, commissionEntry] = await Promise.all([
    chatModel.listByBooking(id),
    commissionLedgerModel.findByBookingId(id),
  ]);

  return { booking, messages, commissionEntry };
}

const CANCELLABLE_STATUSES = ['requested', 'accepted', 'in_progress'];

// Admin override of the customer/worker-facing cancelBooking, which only
// allows requested/accepted (see bookings.service.js) - a completed job's
// commission is already booked, so cancelling it after the fact would
// leave a dangling ledger entry, but an admin can still step in while work
// is in_progress, which a customer/worker can no longer do themselves.
export async function adminCancelBooking(id, adminId, reason) {
  const booking = await adminModel.findBookingRawById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new ApiError(400, 'Booking cannot be cancelled from its current status');
  }

  const updated = await bookingsModel.setCancelled(id, adminId, reason);

  for (const partyId of [updated.customerId, updated.workerId]) {
    if (partyId) {
      await notify(partyId, 'booking_status_changed', {
        bookingId: updated.id,
        status: 'cancelled',
        cancelReason: updated.cancelReason,
      });
    }
  }

  return updated;
}

export async function setBookingFlag(id, { flagged, reason }) {
  const booking = await adminModel.findBookingRawById(id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return adminModel.setBookingFlag(id, { flagged, reason });
}

// ---- Categories/Services (Round B) ----

// Groups the flat service list by category client-side rather than adding a
// real `categories` table - `services.category` is already the only source
// of truth for category grouping everywhere else in the codebase (search,
// worker-apply, etc.), so this keeps that one convention rather than
// forking it. pendingRequestCount is read-only context from the existing
// cross-category approval queue (worker_services.approval_status) - this
// screen doesn't decide those, only Approvals does.
export async function getCategoriesOverview() {
  const [services, pendingByCategory] = await Promise.all([
    adminModel.listServicesAdmin(),
    adminModel.countPendingServiceRequestsByCategory(),
  ]);

  const byCategory = new Map();
  for (const service of services) {
    if (!byCategory.has(service.category)) {
      byCategory.set(service.category, { category: service.category, services: [], pendingRequestCount: 0 });
    }
    byCategory.get(service.category).services.push(service);
  }
  for (const [category, count] of Object.entries(pendingByCategory)) {
    if (!byCategory.has(category)) {
      byCategory.set(category, { category, services: [], pendingRequestCount: 0 });
    }
    byCategory.get(category).pendingRequestCount = count;
  }

  return [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category));
}

export async function createService(input) {
  return adminModel.createService(input);
}

export async function updateService(id, input) {
  const service = await adminModel.findServiceAdminById(id);
  if (!service) throw new ApiError(404, 'Service not found');
  return adminModel.updateService(id, input);
}

export async function setServiceActive(id, isActive) {
  const service = await adminModel.findServiceAdminById(id);
  if (!service) throw new ApiError(404, 'Service not found');
  return adminModel.setServiceActive(id, isActive);
}
