import { Router } from 'express';
import multer from 'multer';
import { ApiError } from '../../middleware/error.middleware.js';
import * as bookingPhotosController from './bookingPhotos.controller.js';

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

// Mounted under bookings.routes.js at /:bookingId/photos - mergeParams so
// req.params.bookingId comes through from the parent route, same pattern
// as chat/reviews/quotes. Auth is already applied at the bookings router
// level.
export const bookingPhotosRoutes = Router({ mergeParams: true });

bookingPhotosRoutes.post('/', upload.single('photo'), bookingPhotosController.upload);
bookingPhotosRoutes.get('/', bookingPhotosController.list);
bookingPhotosRoutes.get('/:photoId/file', bookingPhotosController.file);
