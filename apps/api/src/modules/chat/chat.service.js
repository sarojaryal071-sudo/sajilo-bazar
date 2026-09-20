import { ApiError } from '../../middleware/error.middleware.js';
import { notify } from '../notifications/notifications.service.js';
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
  const booking = await requireParticipant(bookingId, userId);
  const created = await chatModel.create({ bookingId, senderId: userId, message });

  const recipientId = userId === booking.customerId ? booking.workerId : booking.customerId;
  const senderName = userId === booking.customerId ? booking.customerName : booking.workerName;
  if (recipientId) {
    await notify(recipientId, 'chat_message', {
      bookingId,
      senderName,
      preview: message.length > 140 ? `${message.slice(0, 140)}...` : message,
    });
  }

  return created;
}
