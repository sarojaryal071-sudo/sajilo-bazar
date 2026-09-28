import { z } from 'zod';
import { BOOKING_PHOTO_UPLOADED_BY, BOOKING_PHOTO_TYPES } from './enums.js';

export const BookingPhotoSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  uploadedBy: z.enum(BOOKING_PHOTO_UPLOADED_BY),
  photoType: z.enum(BOOKING_PHOTO_TYPES),
  // Deliberately no url - same proxy-only rule as
  // VerificationDocumentSchema. Viewing goes through
  // GET /bookings/:bookingId/photos/:photoId/file, which streams it
  // server-side after checking the requester is a participant on the
  // booking.
  createdAt: z.string().datetime().optional(),
});

// POST /bookings/:id/photos - bookingId comes from the route param,
// uploadedBy is derived server-side from req.user.role (never trusted from
// the client, same principle as BookingDisputeInputSchema deriving
// raisedByUserId from req.user.id rather than the body). photoType is the
// one field the caller actually chooses; the file itself is multipart,
// alongside this JSON field.
export const BookingPhotoUploadInputSchema = z.object({
  photoType: z.enum(BOOKING_PHOTO_TYPES),
});
