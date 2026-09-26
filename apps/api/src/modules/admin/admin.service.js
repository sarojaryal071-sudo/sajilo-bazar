import bcrypt from 'bcryptjs';
import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from './admin.model.js';
import * as authModel from '../auth/auth.model.js';
import * as workersModel from '../workers/workers.model.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as chatModel from '../chat/chat.model.js';
import * as commissionLedgerModel from '../commissionLedger/commissionLedger.model.js';
import { notify } from '../notifications/notifications.service.js';
import * as trustScoreService from '../trustScore/trustScore.service.js';

const SALT_ROUNDS = 10;

// ---- Staff (Round E, 2026-09-27) ----

export async function listStaff() {
  return adminModel.listStaff();
}

export async function getStaffDetail(id) {
  const staff = await adminModel.findStaffById(id);
  if (!staff) throw new ApiError(404, 'Staff account not found');
  return staff;
}

// Reuses authModel.createUser (role: 'admin') rather than a separate
// insert path - same clientId assignment, same password hashing, one
// source of truth for "how a user row comes into existence".
export async function createStaff({ fullName, phone, email, password, departments, isSuperAdmin }) {
  const existing = await authModel.findByPhone(phone);
  if (existing) throw new ApiError(409, 'An account with this phone number already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authModel.createUser({ fullName, phone, email, passwordHash, role: 'admin' });
  return adminModel.setStaffAccess(user.id, { departments, isSuperAdmin });
}

export async function updateStaffAccess(id, { departments, isSuperAdmin }) {
  const staff = await adminModel.findStaffById(id);
  if (!staff) throw new ApiError(404, 'Staff account not found');
  return adminModel.setStaffAccess(id, { departments, isSuperAdmin });
}

export async function getDashboardStats() {
  return adminModel.getDashboardStats();
}

export async function getAnalytics() {
  return adminModel.getAnalytics();
}

export async function getAccountingSummary() {
  return adminModel.getAccountingSummary();
}

export async function getApprovalsQueue() {
  const [documents, services] = await Promise.all([
    adminModel.listPendingDocuments(),
    adminModel.listPendingServices(),
  ]);
  return [...documents, ...services].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

const REJECTION_ESCALATION_THRESHOLD = 3;

// Approving a document only flips the worker's overall verification_status
// once every one of their documents has been approved - a worker who
// uploaded two documents isn't bookable just because the first one cleared.
// Rejecting is immediate: one rejected document means the application needs
// to be redone, same as the existing reapply flow already assumes.
export async function decideDocument(documentId, adminId, decision, comment) {
  const doc = await adminModel.findDocumentById(documentId);
  if (!doc) throw new ApiError(404, 'Document not found');
  if (doc.status !== 'pending') throw new ApiError(400, 'This document has already been reviewed');

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const updated = await adminModel.decideDocument(documentId, { status, adminId, comment });

  if (status === 'rejected') {
    await adminModel.setWorkerVerificationStatus(doc.worker_id, 'rejected');

    // 3-strikes: rather than leaving a repeatedly-rejected worker stuck
    // re-applying into the void, the 3rd rejection auto-opens a support
    // ticket so a human picks it up - doesn't block a 4th reapplication,
    // just guarantees genuine cases get a path to a person. Fires exactly
    // once (checked on the exact threshold), not on every rejection after.
    const rejectedCount = await adminModel.countRejectedDocumentsForWorker(doc.worker_id);
    if (rejectedCount === REJECTION_ESCALATION_THRESHOLD) {
      await adminModel.createSupportTicket({
        userId: doc.worker_id,
        bookingId: null,
        subject: 'Worker verification repeatedly rejected',
        priority: 'high',
        message:
          `This worker's verification documents have been rejected ${REJECTION_ESCALATION_THRESHOLD} times. ` +
          'Auto-opened for a human to review and help them get verified.',
      });
    }
  } else {
    const stillPending = await adminModel.countPendingDocumentsForWorker(doc.worker_id);
    if (stillPending === 0) {
      await adminModel.setWorkerVerificationStatus(doc.worker_id, 'approved');
      await workersModel.assignHandle(doc.worker_id);
    }
  }

  return updated;
}

export async function decideWorkerService(serviceId, adminId, decision, comment) {
  const service = await adminModel.findWorkerServiceById(serviceId);
  if (!service) throw new ApiError(404, 'Service not found');
  if (service.approval_status !== 'pending') {
    throw new ApiError(400, 'This service has already been reviewed');
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  return adminModel.decideWorkerService(serviceId, { status, adminId, comment });
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

export async function setServiceHighRisk(id, highRisk) {
  const service = await adminModel.findServiceAdminById(id);
  if (!service) throw new ApiError(404, 'Service not found');
  return adminModel.setServiceHighRisk(id, highRisk);
}

// ---- Disputes (Round C) ----

// access.departments is null for a Super Admin (sees every department's
// queue); anyone else only sees disputes currently tagged with one of
// their own granted departments - see admin.model.js's listDisputes.
export async function listDisputes({ status }, access) {
  return adminModel.listDisputes({ status, departments: access.isSuperAdmin ? null : access.departments });
}

// Reuses the booking's own chat transcript (the same conversation the
// dispute is about) rather than a separate dispute thread - matches the
// plan's "linked booking + chat transcript" rather than a message log of
// its own.
export async function getDisputeDetail(id) {
  const dispute = await adminModel.findDisputeById(id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const [booking, messages, escalations] = await Promise.all([
    bookingsModel.findById(dispute.bookingId),
    chatModel.listByBooking(dispute.bookingId),
    adminModel.listEscalations('dispute', id),
  ]);

  return { dispute, booking, messages, escalations };
}

// No customer/worker self-service "raise a dispute" flow exists yet, so an
// admin logs it on behalf of whichever party reported it - raisedByUserId
// must actually be a party to the booking, same integrity a real
// self-service flow would get for free from req.user.id.
export async function createDispute({ bookingId, raisedByUserId, reason }) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (![booking.customerId, booking.workerId].includes(raisedByUserId)) {
    throw new ApiError(400, 'raisedByUserId must be a party to this booking');
  }
  return adminModel.createDispute({ bookingId, raisedByUserId, reason });
}

// atFault only means anything for a 'resolved' outcome - a 'dismissed'
// dispute has no fault finding, so it's forced to null here regardless of
// what the client sent (see AdminDisputeResolveInputSchema). An at-fault-
// worker finding feeds the rolling-30-day 3-strikes-style admin-review
// escalation and the trust score's dispute deduction (trustScore module) -
// both fire/recompute from the booking's worker, when there is one.
export async function resolveDispute(id, adminId, { status, resolutionNotes, atFault }) {
  const dispute = await adminModel.findDisputeById(id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  if (dispute.status !== 'open') throw new ApiError(400, 'This dispute has already been decided');

  const resolvedAtFault = status === 'resolved' ? atFault ?? null : null;
  const resolved = await adminModel.resolveDispute(id, { status, resolutionNotes, atFault: resolvedAtFault, adminId });

  const booking = await bookingsModel.findById(resolved.bookingId);
  if (booking) {
    const payload = { disputeId: resolved.id, bookingId: booking.id, status: resolved.status };
    await notify(booking.customerId, 'dispute_resolved', payload);
    if (booking.workerId) await notify(booking.workerId, 'dispute_resolved', payload);
  }

  if (resolvedAtFault === 'worker' && booking?.workerId) {
    await trustScoreService.checkDisputeEscalation(booking.workerId);
    await trustScoreService.recomputeAndStore(booking.workerId);
  }

  return resolved;
}

// Manual only - a support agent picks the new department from a dropdown,
// no automatic/keyword-based routing. Ownership fully transfers (the
// dispute leaves the sender's queue entirely), so the log entry is the
// only remaining trail of who moved it and when.
export async function escalateDispute(id, adminId, department) {
  const dispute = await adminModel.findDisputeById(id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  const updated = await adminModel.setDisputeDepartment(id, department);
  await adminModel.logEscalation({
    entityType: 'dispute',
    entityId: id,
    fromDepartment: dispute.department,
    toDepartment: department,
    escalatedBy: adminId,
  });
  return updated;
}

// ---- Support tickets (Round C) ----

export async function listSupportTickets({ status, priority, q }, access) {
  return adminModel.listSupportTickets({
    status,
    priority,
    q,
    departments: access.isSuperAdmin ? null : access.departments,
  });
}

export async function getSupportTicketDetail(id) {
  const ticket = await adminModel.findSupportTicketById(id);
  if (!ticket) throw new ApiError(404, 'Support ticket not found');

  const [messages, booking, escalations] = await Promise.all([
    adminModel.listTicketMessages(id),
    ticket.bookingId ? bookingsModel.findById(ticket.bookingId) : null,
    adminModel.listEscalations('support_ticket', id),
  ]);

  return { ticket, messages, booking, escalations };
}

export async function createSupportTicket({ userId, bookingId, subject, priority, message }) {
  const user = await adminModel.findUserById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (bookingId) {
    const booking = await bookingsModel.findById(bookingId);
    if (!booking) throw new ApiError(404, 'Booking not found');
  }
  return adminModel.createSupportTicket({ userId, bookingId, subject, priority, message });
}

// The admin's own reply - sender is always the responding admin, unlike the
// ticket's opening message which is recorded as coming from the reporting
// user (see createSupportTicket above).
export async function replyToTicket(id, adminId, message) {
  const ticket = await adminModel.findSupportTicketById(id);
  if (!ticket) throw new ApiError(404, 'Support ticket not found');
  const ticketMessage = await adminModel.addTicketMessage(id, { senderId: adminId, message });
  await notify(ticket.userId, 'support_reply', { ticketId: id, subject: ticket.subject, message });
  return ticketMessage;
}

export async function setTicketStatus(id, status) {
  const ticket = await adminModel.setTicketStatus(id, status);
  if (!ticket) throw new ApiError(404, 'Support ticket not found');
  return ticket;
}

export async function escalateTicket(id, adminId, department) {
  const ticket = await adminModel.findSupportTicketById(id);
  if (!ticket) throw new ApiError(404, 'Support ticket not found');
  const updated = await adminModel.setTicketDepartment(id, department);
  await adminModel.logEscalation({
    entityType: 'support_ticket',
    entityId: id,
    fromDepartment: ticket.department,
    toDepartment: department,
    escalatedBy: adminId,
  });
  return updated;
}

// ---- Publications (2026-09-25) ----
//
// One admin flow for both publication types, routed entirely by `type`:
// - 'notification': publishing fans a real notification out to every
//   matching user via the existing notify()/notifications table (reusing
//   the 'announcement' notification type - only its trigger source
//   changed, from "announcement" to "publication where type=notification").
//   Visible only through the bell/Alerts unread badge and the Alerts feed
//   - never a Home/Dashboard card of any kind.
// - 'promotion': never touches notify()/notifications at all. Rendered
//   only via listActivePromotions (see publications module) as the
//   Home/Dashboard carousel.
// Unpublishing doesn't retract anything already sent - same as every
// other notification in this app, it's a durable, one-way record.

export async function listPublications(filters) {
  return adminModel.listPublications(filters);
}

export async function getPublication(id) {
  const publication = await adminModel.findPublicationById(id);
  if (!publication) throw new ApiError(404, 'Publication not found');
  return publication;
}

export async function createPublication(input, adminId) {
  return adminModel.createPublication({ ...input, createdBy: adminId });
}

export async function updatePublication(id, input) {
  const publication = await adminModel.updatePublication(id, input);
  if (!publication) throw new ApiError(404, 'Publication not found');
  return publication;
}

export async function setPublicationStatus(id, status) {
  const publication = await adminModel.setPublicationStatus(id, status);
  if (!publication) throw new ApiError(404, 'Publication not found');

  if (status === 'published' && publication.type === 'notification') {
    const userIds = await adminModel.listUserIdsForAudience(publication.audience);
    await Promise.all(
      userIds.map((userId) =>
        notify(userId, 'announcement', { publicationId: publication.id, title: publication.title, body: publication.body })
      )
    );
  }

  return publication;
}

// ---- Policies (Round D) ----

export async function listPolicies() {
  return adminModel.listPolicies();
}

export async function getPolicy(policyType) {
  const policy = await adminModel.findPolicyByType(policyType);
  if (!policy) throw new ApiError(404, 'Policy not found');
  return policy;
}

export async function updatePolicy(policyType, input) {
  const policy = await adminModel.updatePolicy(policyType, input);
  if (!policy) throw new ApiError(404, 'Policy not found');
  return policy;
}

export async function setPolicyStatus(policyType, status) {
  const policy = await adminModel.setPolicyStatus(policyType, status);
  if (!policy) throw new ApiError(404, 'Policy not found');
  return policy;
}
