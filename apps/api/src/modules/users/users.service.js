import { ApiError } from '../../middleware/error.middleware.js';
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
