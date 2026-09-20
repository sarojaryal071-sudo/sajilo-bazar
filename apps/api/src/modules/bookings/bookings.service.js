import { ApiError } from '../../middleware/error.middleware.js';
import * as bookingsModel from './bookings.model.js';

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
