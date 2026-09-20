import { ApiError } from '../../middleware/error.middleware.js';
import { emitToUser } from '../../realtime/socket.js';
import * as bookingsModel from './bookings.model.js';

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

export async function createBooking(customerId, { workerId, serviceId, addressLabel, latitude, longitude }) {
  const workerService = await bookingsModel.findActiveWorkerService(workerId, serviceId);
  if (!workerService) throw new ApiError(404, 'This worker does not offer that service');
  return bookingsModel.create({
    customerId,
    workerId,
    serviceId,
    price: workerService.price,
    addressLabel,
    latitude,
    longitude,
  });
}

// Creates the booking, finds online/approved/matching workers within the
// default radius, and fans out an offer to each - the socket push is
// best-effort (see emitToUser), the booking_offers rows are the durable
// record a worker sees the next time they poll/open the app either way.
export async function createInstantBooking(customerId, { serviceId, addressLabel, latitude, longitude }) {
  const booking = await bookingsModel.createInstant({ customerId, serviceId, addressLabel, latitude, longitude });
  const workerIds = await bookingsModel.findNearbyOnlineWorkers(serviceId, latitude, longitude, DEFAULT_RADIUS_KM);
  const offers = await bookingsModel.createOffers(booking.id, workerIds);

  for (const offer of offers) {
    emitToUser(offer.workerId, 'booking:new_offer', { booking, offerId: offer.id });
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

  const booking = await bookingsModel.claimInstant(bookingId, workerId);
  if (!booking) {
    throw new ApiError(409, 'This request has already been taken by another worker');
  }

  await bookingsModel.markOfferAccepted(bookingId, workerId);
  const otherWorkerIds = await bookingsModel.expirePendingOffers(bookingId, workerId);

  emitToUser(booking.customerId, 'booking:assigned', { booking });
  for (const otherWorkerId of otherWorkerIds) {
    emitToUser(otherWorkerId, 'booking:offer_resolved', { bookingId, status: 'expired' });
  }

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
  return bookingsModel.setAccepted(bookingId);
}

export async function declineBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'requested') {
    throw new ApiError(400, 'Booking cannot be declined from its current status');
  }
  return bookingsModel.setDeclined(bookingId);
}

export async function startBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'accepted') {
    throw new ApiError(400, 'Booking cannot be started from its current status');
  }
  return bookingsModel.setInProgress(bookingId);
}

export async function completeBooking(bookingId, workerId) {
  const booking = await requireWorkerOwned(bookingId, workerId);
  if (booking.status !== 'in_progress') {
    throw new ApiError(400, 'Booking cannot be completed from its current status');
  }
  return bookingsModel.setCompleted(bookingId);
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
  return bookingsModel.setCancelled(bookingId, userId, reason);
}
