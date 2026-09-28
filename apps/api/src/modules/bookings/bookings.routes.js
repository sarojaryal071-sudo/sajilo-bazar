import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedWorker } from '../../middleware/auth.middleware.js';
import * as bookingsController from './bookings.controller.js';
import { chatRoutes } from '../chat/chat.routes.js';
import { reviewsRoutes } from '../reviews/reviews.routes.js';
import { bookingQuotesRoutes } from '../quotes/quotes.routes.js';
import { bookingPhotosRoutes } from '../bookingPhotos/bookingPhotos.routes.js';

export const bookingsRoutes = Router();

bookingsRoutes.use(requireAuth);

bookingsRoutes.post('/', requireRole('customer'), bookingsController.create);
bookingsRoutes.post('/fuel-quote', requireRole('customer'), bookingsController.quoteFuelCharge);
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
// standalone top-level routes. Quotes (submit/list) and photos
// (upload/list/stream) follow the same nesting - their other endpoints
// (PATCH /quotes/:id, GET /quotes/:id/photo) are addressed independently
// of a booking id, so those live in quotesRoutes, mounted separately in
// app.js.
bookingsRoutes.use('/:bookingId/messages', chatRoutes);
bookingsRoutes.use('/:bookingId/review', reviewsRoutes);
bookingsRoutes.use('/:bookingId/quotes', bookingQuotesRoutes);
bookingsRoutes.use('/:bookingId/photos', bookingPhotosRoutes);
