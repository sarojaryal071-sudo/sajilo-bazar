import { Router } from 'express';
import * as chatController from './chat.controller.js';

// Mounted under bookings.routes.js at /:bookingId/messages - mergeParams so
// req.params.bookingId comes through from the parent route. Auth is already
// applied at the bookings router level.
export const chatRoutes = Router({ mergeParams: true });

chatRoutes.get('/', chatController.list);
chatRoutes.post('/', chatController.send);
