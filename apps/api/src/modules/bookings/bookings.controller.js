import {
  BookingCreateInputSchema,
  BookingCancelInputSchema,
  InstantBookingCreateInputSchema,
  BookingDisputeInputSchema,
  CompleteBookingInputSchema,
} from '@sajilo-bazar/shared';
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

export async function createInstant(req, res, next) {
  try {
    const input = InstantBookingCreateInputSchema.parse(req.body);
    const { booking, matchedWorkerCount } = await bookingsService.createInstantBooking(req.user.id, input);
    res.status(201).json({ booking, matchedWorkerCount });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid instant request data', err.issues) : err);
  }
}

export async function claim(req, res, next) {
  try {
    const booking = await bookingsService.claimInstantBooking(Number(req.params.id), req.user.id);
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function declineOffer(req, res, next) {
  try {
    await bookingsService.declineInstantOffer(Number(req.params.id), req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
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
    const input = CompleteBookingInputSchema.parse(req.body);
    const booking = await bookingsService.completeBooking(Number(req.params.id), req.user.id, input);
    res.json({ booking });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid completion data', err.issues) : err);
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

export async function createDispute(req, res, next) {
  try {
    const { reason } = BookingDisputeInputSchema.parse(req.body);
    const dispute = await bookingsService.createDispute(Number(req.params.id), req.user.id, reason);
    res.status(201).json({ dispute });
  } catch (err) {
    next(err.issues ? new ApiError(400, 'Invalid report', err.issues) : err);
  }
}
