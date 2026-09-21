import { ApiError } from '../../middleware/error.middleware.js';
import { emitToUser } from '../../realtime/socket.js';
import { notify } from '../notifications/notifications.service.js';
import * as commissionLedgerService from '../commissionLedger/commissionLedger.service.js';
import * as bookingsModel from './bookings.model.js';
import * as adminModel from '../admin/admin.model.js';

// City-scale default - no fallback tiers (e.g. widening the radius when
// nobody's nearby) for this first pass; a customer with no match just sees
// "no workers available" and can cancel or retry.
const DEFAULT_RADIUS_KM = 15;

function assertParticipant(booking, userId) {
  if (booking.customerId !== userId && booking.workerId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
}

async function requireWorkerOwned(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.workerId !== workerId) throw new ApiError(403, 'Forbidden');
  return booking;
}

function serviceNames(booking) {
  return booking.services.map((s) => s.name).join(', ');
}

export async function createBooking(customerId, { workerId, serviceIds, addressLabel, latitude, longitude }) {
  const available = await bookingsModel.findActiveWorkerServices(workerId, serviceIds);
  if (available.length !== serviceIds.length) {
    throw new ApiError(404, 'This worker does not offer one or more of the selected services');
  }
  const booking = await bookingsModel.create({
    customerId,
    workerId,
    services: available,
    addressLabel,
    latitude,
    longitude,
  });

  await notify(workerId, 'booking_requested', {
    bookingId: booking.id,
    serviceName: serviceNames(booking),
    customerName: booking.customerName,
  });

  return booking;
}

// Creates the booking, finds online/approved workers who offer EVERY
// requested service within the default radius, and fans out an offer to
// each - the socket push is best-effort (see emitToUser), the
// booking_offers rows are the durable record a worker sees the next time
// they poll/open the app either way.
export async function createInstantBooking(customerId, { serviceIds, addressLabel, latitude, longitude }) {
  const booking = await bookingsModel.createInstant({ customerId, serviceIds, addressLabel, latitude, longitude });
  const workerIds = await bookingsModel.findNearbyOnlineWorkers(serviceIds, latitude, longitude, DEFAULT_RADIUS_KM);
  const offers = await bookingsModel.createOffers(booking.id, workerIds);

  for (const offer of offers) {
    emitToUser(offer.workerId, 'booking:new_offer', { booking, offerId: offer.id });
    await notify(offer.workerId, 'booking_requested', {
      bookingId: booking.id,
      serviceName: serviceNames(booking),
      addressLabel: booking.addressLabel,
    });
  }

  return { booking, matchedWorkerCount: offers.length };
}

// First accept wins - the DB update itself is the source of truth for who
// gets it (see claimInstant's WHERE clause), everything after is just
// bookkeeping and notifying the loser workers/the customer.
export async function claimInstantBooking(bookingId, workerId) {
  const offer = await bookingsModel.findOffer(bookingId, workerId);
  if (!offer || offer.status !== 'pending') {
    throw new ApiError(404, 'No pending offer found for this booking');
  }

  const { booking, reason } = await bookingsModel.claimInstant(bookingId, workerId);
  if (!booking) {
    throw new ApiError(
      409,
      reason === 'services_unavailable'
        ? 'You no longer offer all of the requested services'
        : 'This request has already been taken by another worker'
    );
  }

  await bookingsModel.markOfferAccepted(bookingId, workerId);
  const otherWorkerIds = await bookingsModel.expirePendingOffers(bookingId, workerId);

  emitToUser(booking.customerId, 'booking:assigned', { booking });
  for (const otherWorkerId of otherWorkerIds) {
    emitToUser(otherWorkerId, 'booking:offer_resolved', { bookingId, status: 'expired' });
  }

  await notify(booking.customerId, 'booking_accepted', {
    bookingId: booking.id,
    workerName: booking.workerName,
  });

  return booking;
}

export async function declineInstantOffer(bookingId, workerId) {
  const offer = await bookingsModel.declineOffer(bookingId, workerId);
  if (!offer) throw new ApiError(404, 'No pending offer found for this booking');
}

export async function listBookings(userId, role, status) {
  return bookingsModel.listForUser(userId, role, status || null);
}

export async function getBooking(bookingId, userId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  assertParticipant(booking, userId);
  return booking;
}

export async function acceptBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'requested') {
    throw new ApiError(400, 'Booking cannot be accepted from its current status');
  }
  const updated = await bookingsModel.setAccepted(bookingId);
  await notify(updated.customerId, 'booking_accepted', {
    bookingId: updated.id,
    workerName: updated.workerName,
  });
  return updated;
}

export async function declineBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'requested') {
    throw new ApiError(400, 'Booking cannot be declined from its current status');
  }
  const updated = await bookingsModel.setDeclined(bookingId);
  await notify(updated.customerId, 'booking_declined', {
    bookingId: updated.id,
    workerName: updated.workerName,
  });
  return updated;
}

export async function startBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'accepted') {
    throw new ApiError(400, 'Booking cannot be started from its current status');
  }
  const updated = await bookingsModel.setInProgress(bookingId);
  await notify(updated.customerId, 'booking_status_changed', {
    bookingId: updated.id,
    status: 'in_progress',
  });
  return updated;
}

export async function completeBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'in_progress') {
    throw new ApiError(400, 'Booking cannot be completed from its current status');
  }
  const updated = await bookingsModel.setCompleted(bookingId);
  await commissionLedgerService.recordCompletion(updated);
  await notify(updated.customerId, 'booking_status_changed', {
    bookingId: updated.id,
    status: 'completed',
  });
  return updated;
}

// Either side can cancel, but only before work has actually started - once
// a job is in_progress it has to be finished, not cancelled.
export async function cancelBooking(bookingId, userId, reason) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  assertParticipant(booking, userId);
  if (!['requested', 'accepted'].includes(booking.status)) {
    throw new ApiError(400, 'Booking can only be cancelled while requested or accepted');
  }
  const updated = await bookingsModel.setCancelled(bookingId, userId, reason);

  // Notify whichever side didn't do the cancelling - the other party
  // always exists here (customerId is required, and a manual/claimed
  // booking's workerId is set; an unclaimed instant request has no worker
  // to tell yet, so there's simply nothing to notify in that case).
  const otherPartyId = userId === updated.customerId ? updated.workerId : updated.customerId;
  if (otherPartyId) {
    await notify(otherPartyId, 'booking_status_changed', {
      bookingId: updated.id,
      status: 'cancelled',
      cancelReason: updated.cancelReason,
    });
  }

  return updated;
}

// "Report a problem" from the booking detail screen - the disputes table
// and its admin-side list/detail/resolve screens already exist (Round C);
// this is just the missing self-service entry point, reusing the same
// row shape an admin would create on a party's behalf. Data access is
// reused from adminModel directly rather than adminService, matching how
// admin.service.js itself only ever reaches into other modules' *.model.js.
export async function createDispute(bookingId, userId, reason) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  assertParticipant(booking, userId);
  return adminModel.createDispute({ bookingId, raisedByUserId: userId, reason });
}
