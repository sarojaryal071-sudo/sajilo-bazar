import { BookingCreateInputSchema, BookingCancelInputSchema } from '@sajilo-bazar/shared';
import { ApiError } from '../../middleware/error.middleware.js';
import * as bookingsService from './bookings.service.js';

export async function create(req, res, next) {
  try {
    const input = BookingCreateInputSchema.parse(req.body);
    const booking = await bookingsService.createBooking(req.user.id, input);
    res.status(201).json({ booking });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid booking data', err.issues) : err);
  }
}

export async function list(req, res, next) {
  try {
    const bookings = await bookingsService.listBookings(req.user.id, req.user.role, req.query.status);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next(new ApiError(400, 'Invalid booking id'));
    const booking = await bookingsService.getBooking(id, req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function accept(req, res, next) {
  try {
    const booking = await bookingsService.acceptBooking(Number(req.params.id), req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function decline(req, res, next) {
  try {
    const booking = await bookingsService.declineBooking(Number(req.params.id), req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function start(req, res, next) {
  try {
    const booking = await bookingsService.startBooking(Number(req.params.id), req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function complete(req, res, next) {
  try {
    const booking = await bookingsService.completeBooking(Number(req.params.id), req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const { reason } = BookingCancelInputSchema.parse(req.body ?? {});
    const booking = await bookingsService.cancelBooking(Number(req.params.id), req.user.id, reason);
    res.json({ booking });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid cancel data', err.issues) : err);
  }
}
