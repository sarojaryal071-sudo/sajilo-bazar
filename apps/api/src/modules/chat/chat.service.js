import { ApiError } from '../../middleware/error.middleware.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as chatModel from './chat.model.js';

async function requireParticipant(bookingId, userId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== userId && booking.workerId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
  return booking;
}

export async function listMessages(bookingId, userId) {
  await requireParticipant(bookingId, userId);
  return chatModel.listByBooking(bookingId);
}

export async function sendMessage(bookingId, userId, message) {
  await requireParticipant(bookingId, userId);
  return chatModel.create({ bookingId, senderId: userId, message });
}
