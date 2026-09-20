import { Router } from 'express';
import { requireRole } from '../../middleware/auth.middleware.js';
import * as reviewsController from './reviews.controller.js';

// Mounted under bookings.routes.js at /:bookingId/review - mergeParams so
// req.params.bookingId comes through. Auth is already applied at the
// bookings router level; only creating a review is customer-only.
export const reviewsRoutes = Router({ mergeParams: true });

reviewsRoutes.get('/', reviewsController.get);
reviewsRoutes.post('/', requireRole('customer'), reviewsController.create);
