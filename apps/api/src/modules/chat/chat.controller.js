import { ChatMessageCreateInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as chatService from './chat.service.js';

export async function list(req, res, next) {
  try {
    const messages = await chatService.listMessages(Number(req.params.bookingId), req.user.id);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

export async function send(req, res, next) {
  try {
    const { message } = ChatMessageCreateInputSchema.parse(req.body);
    const created = await chatService.sendMessage(Number(req.params.bookingId), req.user.id, message);
    res.status(201).json({ message: created });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid message', err.issues) : err);
  }
}
