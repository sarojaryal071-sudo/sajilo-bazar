import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as bookingPhotosModel from './bookingPhotos.model.js';

async function requireParticipant(bookingId, userId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== userId && booking.workerId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
  return booking;
}

// uploadedBy is derived from the requester's role, never trusted from the
// client - a customer can only ever upload as 'customer', a worker only as
// 'worker' (see BookingPhotoUploadInputSchema).
export async function uploadPhoto(bookingId, userId, userRole, photoType, file) {
  if (!file) throw new ApiError(400, 'A photo file is required');
  await requireParticipant(bookingId, userId);

  const uploadedBy = userRole === 'worker' ? 'worker' : 'customer';
  const result = await uploadBuffer(file.buffer, { folder: `sajilo-bazar/bookings/${bookingId}/photos` });

  return bookingPhotosModel.create({ bookingId, uploadedBy, photoType, url: result.secure_url });
}

export async function listPhotos(bookingId, userId) {
  await requireParticipant(bookingId, userId);
  return bookingPhotosModel.listByBooking(bookingId);
}

// Proxy stream target - same never-expose-the-raw-URL rule as
// admin.service.js's getDocumentFile.
export async function getPhotoFile(bookingId, photoId, userId) {
  await requireParticipant(bookingId, userId);
  const photo = await bookingPhotosModel.findRawById(photoId);
  if (!photo || photo.booking_id !== bookingId) throw new ApiError(404, 'Photo not found');

  const upstream = await fetch(photo.url);
  if (!upstream.ok) throw new ApiError(502, 'Could not retrieve this photo right now');
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return { buffer, contentType: upstream.headers.get('content-type') || 'application/octet-stream' };
}
