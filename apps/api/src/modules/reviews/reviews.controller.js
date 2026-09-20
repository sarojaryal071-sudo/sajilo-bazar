import { ReviewCreateInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as reviewsService from './reviews.service.js';

export async function get(req, res, next) {
  try {
    const review = await reviewsService.getReview(Number(req.params.bookingId));
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const input = ReviewCreateInputSchema.parse(req.body);
    const review = await reviewsService.createReview(Number(req.params.bookingId), req.user.id, input);
    res.status(201).json({ review });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid review data', err.issues) : err);
  }
}
