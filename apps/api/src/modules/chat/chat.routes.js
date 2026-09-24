import { Router } from 'express';
import multer from 'multer';
import { ApiError } from '../../middleware/error.middleware.js';
import * as chatController from './chat.controller.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only images (JPEG/PNG/WebP/GIF) and PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Mounted under bookings.routes.js at /:bookingId/messages - mergeParams so
// req.params.bookingId comes through from the parent route. Auth is already
// applied at the bookings router level.
export const chatRoutes = Router({ mergeParams: true });

chatRoutes.get('/', chatController.list);
chatRoutes.post('/', chatController.send);
chatRoutes.post('/attachment', upload.single('file'), chatController.sendAttachment);
