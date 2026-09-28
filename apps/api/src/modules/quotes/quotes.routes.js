import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireApprovedWorker } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../middleware/error.middleware.js';
import * as quotesController from './quotes.controller.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG/PNG/WebP images are allowed'));
    }
    cb(null, true);
  },
});

// Mounted under bookings.routes.js at /:bookingId/quotes - mergeParams so
// req.params.bookingId comes through from the parent route, same pattern
// as chat/reviews. Auth is already applied at the bookings router level.
export const bookingQuotesRoutes = Router({ mergeParams: true });

bookingQuotesRoutes.post('/', requireApprovedWorker, upload.single('photo'), quotesController.submit);
bookingQuotesRoutes.get('/', quotesController.list);

// Top-level - a quote isn't addressed through its booking here since the
// decision-maker (the customer) doesn't necessarily know/need the booking
// id to act on a specific quote once they're looking at a list of them.
export const quotesRoutes = Router();

quotesRoutes.use(requireAuth);
quotesRoutes.patch('/:id', quotesController.decide);
quotesRoutes.get('/:id/photo', quotesController.photo);
