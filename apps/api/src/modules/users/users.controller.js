import { ProfileUpdateInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as usersService from './users.service.js';

export async function getMe(req, res, next) {
  try {
    const user = await usersService.getProfile(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const input = ProfileUpdateInputSchema.parse(req.body);
    const user = await usersService.updateProfile(req.user.id, input);
    res.json({ user });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid profile data', err.issues) : err);
  }
}
