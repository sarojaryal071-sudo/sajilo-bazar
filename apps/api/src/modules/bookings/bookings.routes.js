import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedWorker } from '../../middleware/auth.middleware.js';
import * as bookingsController from './bookings.controller.js';
import { chatRoutes } from '../chat/chat.routes.js';
import { reviewsRoutes } from '../reviews/reviews.routes.js';

export const bookingsRoutes = Router();

bookingsRoutes.use(requireAuth);

bookingsRoutes.post('/', requireRole('customer'), bookingsController.create);
bookingsRoutes.post('/instant', requireRole('customer'), bookingsController.createInstant);
bookingsRoutes.get('/', bookingsController.list);
bookingsRoutes.get('/:id', bookingsController.detail);
bookingsRoutes.patch('/:id/accept', requireApprovedWorker, bookingsController.accept);
bookingsRoutes.patch('/:id/decline', requireApprovedWorker, bookingsController.decline);
bookingsRoutes.patch('/:id/claim', requireApprovedWorker, bookingsController.claim);
bookingsRoutes.patch('/:id/decline-offer', requireApprovedWorker, bookingsController.declineOffer);
bookingsRoutes.patch('/:id/start', requireApprovedWorker, bookingsController.start);
bookingsRoutes.patch('/:id/complete', requireApprovedWorker, bookingsController.complete);
bookingsRoutes.patch('/:id/cancel', bookingsController.cancel);
bookingsRoutes.post('/:id/dispute', bookingsController.createDispute);

// Chat and review both live under a specific booking, and both need to
// check the requester is a participant on it - nested here rather than as
// standalone top-level routes.
bookingsRoutes.use('/:bookingId/messages', chatRoutes);
bookingsRoutes.use('/:bookingId/review', reviewsRoutes);
