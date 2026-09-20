import { SignupInputSchema, LoginInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as authService from './auth.service.js';

export async function signup(req, res, next) {
  try {
    const input = SignupInputSchema.parse(req.body);
    const result = await authService.signup(input);
    res.status(201).json(result);
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid signup data', err.issues) : err);
  }
}

export async function login(req, res, next) {
  try {
    const input = LoginInputSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid login data', err.issues) : err);
  }
}
