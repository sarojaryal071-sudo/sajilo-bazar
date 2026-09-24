import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
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

async function notifyOtherParty(booking, userId, bookingId, preview) {
  const recipientId = userId === booking.customerId ? booking.workerId : booking.customerId;
  const senderName = userId === booking.customerId ? booking.customerName : booking.workerName;
  if (recipientId) {
    await notify(recipientId, 'chat_message', { bookingId, senderName, preview });
  }
}

export async function listMessages(bookingId, userId) {
  await requireParticipant(bookingId, userId);
  return chatModel.listByBooking(bookingId);
}

export async function sendMessage(bookingId, userId, message) {
  const booking = await requireParticipant(bookingId, userId);
  const created = await chatModel.create({ bookingId, senderId: userId, message });
  await notifyOtherParty(
    booking,
    userId,
    bookingId,
    message.length > 140 ? `${message.slice(0, 140)}...` : message
  );
  return created;
}

// file: a multer memory-storage file (image or PDF, size/mimetype already
// validated by chat.routes.js's upload middleware). Same Cloudinary upload
// path as verification documents/profile photos - one bucket of
// credentials, no second upload mechanism.
export async function sendAttachment(bookingId, userId, file) {
  if (!file) throw new ApiError(400, 'A file is required');
  const booking = await requireParticipant(bookingId, userId);

  const attachmentType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  const result = await uploadBuffer(file.buffer, { folder: `sajilo-bazar/chat/${bookingId}` });

  const created = await chatModel.create({
    bookingId,
    senderId: userId,
    attachmentUrl: result.secure_url,
    attachmentType,
    attachmentName: file.originalname,
  });
  await notifyOtherParty(
    booking,
    userId,
    bookingId,
    attachmentType === 'pdf' ? '📄 Sent a file' : '📷 Sent a photo'
  );
  return created;
}
