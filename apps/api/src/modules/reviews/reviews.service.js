import { ApiError } from '../../middleware/error.middleware.js';
import { notify } from '../notifications/notifications.service.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as reviewsModel from './reviews.model.js';

export async function getReview(bookingId) {
  return reviewsModel.findByBookingId(bookingId);
}

export async function createReview(bookingId, customerId, { rating, comment }) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== customerId) throw new ApiError(403, 'Forbidden');
  if (booking.status !== 'completed') throw new ApiError(400, 'Booking is not completed yet');

  const existing = await reviewsModel.findByBookingId(bookingId);
  if (existing) throw new ApiError(409, 'This booking already has a review');

  const review = await reviewsModel.createAndRecalc({
    bookingId,
    workerId: booking.workerId,
    rating,
    comment,
  });

  await notify(booking.workerId, 'review_received', {
    bookingId,
    rating,
    customerName: booking.customerName,
  });

  return review;
}
