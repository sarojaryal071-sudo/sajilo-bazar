import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import { notify } from '../notifications/notifications.service.js';
import { emitToUser, isUserInBookingRoom } from '../../realtime/socket.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as bookingPhotosModel from '../bookingPhotos/bookingPhotos.model.js';
import * as chatModel from './chat.model.js';

async function requireParticipant(bookingId, userId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== userId && booking.workerId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
  return booking;
}

function resolveOtherPartyId(booking, userId) {
  return userId === booking.customerId ? booking.workerId : booking.customerId;
}

// If the recipient's socket is currently sitting in this booking's chat
// room, the message is "delivered" the instant it's created - mark it and
// push a tick update to the sender's own connection(s) so the UI flips
// from single to double-gray without waiting on the sender's next poll.
// If the recipient isn't connected to the room right now, the message
// stays undelivered until they next join it (see markDeliveredOnJoin,
// called from chat.socket.js's 'chat:join' handler).
async function maybeMarkDelivered(booking, message, recipientId) {
  if (!recipientId || !isUserInBookingRoom(recipientId, booking.id)) return message;
  const updated = await chatModel.markMessageDelivered(message.id);
  if (!updated) return message;
  emitToUser(message.senderId, 'chat:delivered', {
    bookingId: booking.id,
    messageIds: [message.id],
    deliveredAt: updated.deliveredAt,
  });
  return updated;
}

async function notifyOtherParty(booking, userId, bookingId, preview) {
  const recipientId = userId === booking.customerId ? booking.workerId : booking.customerId;
  const senderName = userId === booking.customerId ? booking.customerName : booking.workerName;
  if (recipientId) {
    await notify(recipientId, 'chat_message', { bookingId, senderName, preview });
  }
}

// Phase 3a: once a specific worker is confirmed for a Manual booking
// (status 'requested' -> 'accepted', either via plain accept or an
// accepted counter-quote - see bookings.service.js acceptBooking and
// quotes.service.js decideQuote), auto-post the customer's problem photo
// (attached at booking-request time, if any) as the first message in that
// worker's now-open chat - attributed to the customer, using the same
// attachment rendering as any other chat photo. Deliberately no
// notifyOtherParty() call: this isn't new information to either side (the
// customer already saw their own photo, the worker already saw it on the
// booking request itself), so it must not fire a "new message"
// notification - only genuine new messages sent after this point should.
// A no-op if the customer never attached one.
export async function postProblemPhotoIfAny(booking) {
  const photo = await bookingPhotosModel.findRawProblemPhoto(booking.id);
  if (!photo) return;
  const created = await chatModel.create({
    bookingId: booking.id,
    senderId: booking.customerId,
    attachmentUrl: photo.url,
    attachmentType: 'image',
  });
  await maybeMarkDelivered(booking, created, resolveOtherPartyId(booking, booking.customerId));
}

export async function listMessages(bookingId, userId) {
  await requireParticipant(bookingId, userId);
  return chatModel.listByBooking(bookingId);
}

export async function sendMessage(bookingId, userId, message) {
  const booking = await requireParticipant(bookingId, userId);
  const created = await chatModel.create({ bookingId, senderId: userId, message });
  const delivered = await maybeMarkDelivered(booking, created, resolveOtherPartyId(booking, userId));
  await notifyOtherParty(
    booking,
    userId,
    bookingId,
    message.length > 140 ? `${message.slice(0, 140)}...` : message
  );
  return delivered;
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
  const delivered = await maybeMarkDelivered(booking, created, resolveOtherPartyId(booking, userId));
  await notifyOtherParty(
    booking,
    userId,
    bookingId,
    attachmentType === 'pdf' ? '📄 Sent a file' : '📷 Sent a photo'
  );
  return delivered;
}

// Called from chat.socket.js's 'chat:join' handler - every message from
// the OTHER party not yet delivered is delivered now, since this user's
// socket just joined the room. Returns who to notify (the sender of those
// now-delivered messages) so the caller can push a live tick update.
export async function markDeliveredOnJoin(bookingId, userId) {
  const booking = await requireParticipant(bookingId, userId);
  const messageIds = await chatModel.markUndeliveredAsDelivered(bookingId, userId);
  return { messageIds, otherPartyId: resolveOtherPartyId(booking, userId) };
}

// Called from chat.socket.js's 'chat:read' handler, emitted by the client
// while the chat screen is actually open/visible (see BookingChat.jsx) -
// every unread message from the OTHER party is marked read now.
export async function markAsRead(bookingId, userId) {
  const booking = await requireParticipant(bookingId, userId);
  const messageIds = await chatModel.markUnreadAsRead(bookingId, userId);
  return { messageIds, otherPartyId: resolveOtherPartyId(booking, userId) };
}
