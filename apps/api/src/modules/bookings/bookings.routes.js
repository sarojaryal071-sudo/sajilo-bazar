import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import * as bookingsController from './bookings.controller.js';
import { chatRoutes } from '../chat/chat.routes.js';
import { reviewsRoutes } from '../reviews/reviews.routes.js';

export const bookingsRoutes = Router();

bookingsRoutes.use(requireAuth);

bookingsRoutes.post('/', requireRole('customer'), bookingsController.create);
bookingsRoutes.post('/instant', requireRole('customer'), bookingsController.createInstant);
bookingsRoutes.get('/', bookingsController.list);
bookingsRoutes.get('/:id', bookingsController.detail);
bookingsRoutes.patch('/:id/accept', requireRole('worker'), bookingsController.accept);
bookingsRoutes.patch('/:id/decline', requireRole('worker'), bookingsController.decline);
bookingsRoutes.patch('/:id/claim', requireRole('worker'), bookingsController.claim);
bookingsRoutes.patch('/:id/decline-offer', requireRole('worker'), bookingsController.declineOffer);
bookingsRoutes.patch('/:id/start', requireRole('worker'), bookingsController.start);
bookingsRoutes.patch('/:id/complete', requireRole('worker'), bookingsController.complete);
bookingsRoutes.patch('/:id/cancel', bookingsController.cancel);

// Chat and review both live under a specific booking, and both need to
// check the requester is a participant on it - nested here rather than as
// standalone top-level routes.
bookingsRoutes.use('/:bookingId/messages', chatRoutes);
bookingsRoutes.use('/:bookingId/review', reviewsRoutes);
