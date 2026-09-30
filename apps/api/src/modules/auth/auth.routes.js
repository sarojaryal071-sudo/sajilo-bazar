import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as authController from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/signup', authController.signup);
authRoutes.post('/login', authController.login);
authRoutes.post('/google', authController.google);
authRoutes.post('/google/complete', authController.completeGoogleSignup);
authRoutes.post('/forgot-password', authController.forgotPassword);

// Document-based password reset for locked-out workers (target-spec Phase
// 9/10) - public like forgot-password above (no token to authenticate
// with), but goes into an admin-reviewed queue instead of resetting
// immediately. change-password is the forced-reset counterpart on the
// other side of that review: requireAuth because it's reached only after
// logging in with the temp password an admin issued.
authRoutes.post('/password-reset-requests', authController.requestPasswordReset);
authRoutes.post('/change-password', requireAuth, authController.changePassword);
