import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as usersModel from './users.model.js';
import * as adminModel from '../admin/admin.model.js';

export async function getProfile(userId) {
  const user = await usersModel.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export async function updateProfile(userId, input) {
  const user = await usersModel.updateProfile(userId, input);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

// Same Cloudinary upload path the worker-apply verification documents use -
// one place, one bucket of credentials, no second upload mechanism.
export async function uploadPhoto(userId, file) {
  if (!file) throw new ApiError(400, 'A photo file is required');
  const result = await uploadBuffer(file.buffer, { folder: `sajilo-bazar/profile-photos/${userId}` });
  return updateProfile(userId, { profileImageUrl: result.secure_url });
}

// The "Help & Support" hamburger menu form (both roles) - a general
// contact-support entry point, not tied to a booking, so no party/booking
// validation is needed beyond req.user.id being an authenticated user.
// Reuses the support_tickets table and admin screens already built
// (Round C) via adminModel directly, same pattern as bookings.service.js's
// createDispute.
export async function createSupportTicket(userId, { subject, message }) {
  return adminModel.createSupportTicket({ userId, bookingId: null, subject, priority: 'normal', message });
}
