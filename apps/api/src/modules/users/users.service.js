import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as usersModel from './users.model.js';
import * as adminModel from '../admin/admin.model.js';

let googleClient = null;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, 'Google sign-in is not configured on this server');
  }
  if (!googleClient) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
}

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

// Reversible (Settings -> Deactivate account). Logging back in
// (auth.service.js assertLoginAllowedAndReactivate) is the only path back -
// there's no separate "reactivate" endpoint.
export async function deactivateAccount(userId) {
  const user = await usersModel.deactivate(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

// Irreversible (Settings -> Delete account) - the in-app data deletion
// request promised in the Privacy Policy. See users.model.js anonymize for
// what's actually retained vs. scrubbed.
export async function deleteAccount(userId) {
  const user = await usersModel.anonymize(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

// Settings -> Account -> Connected Google account -> Connect. Verifies the
// ID token server-side (never trusts a client-supplied identity), same as
// sign-in's googleAuth. Refuses to steal a Google identity already linked
// to a different Sajilo Bazar account.
export async function linkGoogleAccount(userId, { idToken }) {
  const client = getGoogleClient();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google sign-in');
  }

  const existing = await usersModel.findByGoogleId(payload.sub);
  if (existing && existing.id !== userId) {
    throw new ApiError(409, 'This Google account is already linked to a different Sajilo Bazar account');
  }

  return usersModel.setGoogleId(userId, payload.sub);
}

// Refuses to unlink a Google-only account that has never set a password -
// that would leave no way to ever log back in (see auth.model.js
// createUser: passwordHash stays NULL until "Forgot password" sets one).
export async function unlinkGoogleAccount(userId) {
  const user = await usersModel.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.hasPassword) {
    throw new ApiError(400, 'Set a password first (via "Change password") before disconnecting Google');
  }
  return usersModel.clearGoogleId(userId);
}
