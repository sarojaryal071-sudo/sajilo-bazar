import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import * as usersModel from './users.model.js';

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
