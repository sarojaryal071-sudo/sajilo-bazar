import { z } from 'zod';
import {
  BOOKING_TYPES,
  BOOKING_STATUSES,
  BOOKING_OFFER_STATUSES,
  RESPONSE_DEADLINE_HOURS,
  PAYMENT_METHODS,
} from './enums.js';

// Defined now for contract stability across phases, implemented in the
// Booking module (Phase 2-3 of the roadmap), not the Auth module.

// One row per service included in a booking - price is null for an
// instant request's services until a worker claims it (see
// booking_services in DATA_MODEL.md for why it's nullable at the DB level).
export const BookingServiceSchema = z.object({
  id: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  name: z.string(),
  category: z.string(),
  price: z.number().positive().nullable(),
});

export const BookingSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(BOOKING_TYPES),
  status: z.enum(BOOKING_STATUSES),
  customerId: z.number().int().positive(),
  workerId: z.number().int().positive().nullable(), // null until an instant request is accepted
  workerHandle: z.string().max(10).nullable().optional(), // e.g. "PL042", null pre-approval
  // Only present once the worker has accepted (status accepted/in_progress) -
  // hidden again once completed. Never sent for any other status, and never
  // exposed anywhere outside a booking's own detail response (search/worker
  // detail never select it at all). See workers phone-scoping spec.
  workerPhone: z.string().nullable().optional(),
  services: z.array(BookingServiceSchema).min(1),
  price: z.number().positive().nullable(), // denormalized sum of services[].price - null until every service is priced
  // Base fee + per-km rate (both admin-editable, see platformSettings
  // module), computed once the worker is known (manual booking: at
  // creation; instant: at claim) from that worker's saved location and
  // this booking's own address. A pass-through to the worker - never
  // folded into price, which is what the 15% commission is calculated
  // against. Defaults to 0 (DB-level default) until a worker is assigned.
  fuelCharge: z.number().nonnegative(),
  addressLabel: z.string().max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  // Snapshotted from the picked address at booking time (district-based
  // matching, Part B) - null when that address never resolved to one (a
  // freeform "one-off" AddressPicker entry with no district chosen).
  district: z.string().max(60).nullable().optional(),
  cancelledBy: z.number().int().positive().nullable().optional(),
  cancelReason: z.string().max(300).nullable().optional(),
  // Scheduled booking only (business plan §13) - both null for an urgent
  // ("now") booking. scheduledFor is the customer-picked future date/time;
  // respondBy is when the worker's response window closes (createdAt +
  // responseDeadlineHours), after which an unanswered 'requested' booking
  // auto-expires to 'declined' (see bookings.service.js).
  scheduledFor: z.string().datetime().nullable().optional(),
  responseDeadlineHours: z
    .number()
    .int()
    .refine((h) => RESPONSE_DEADLINE_HOURS.includes(h))
    .nullable()
    .optional(),
  respondBy: z.string().datetime().nullable().optional(),
  // Set at completion (see CompleteBookingInputSchema below) - defaults to
  // 'cash' at the DB level for every booking, but only meaningful once
  // completed (that's the only place it's surfaced in the UI).
  paymentMethod: z.enum(PAYMENT_METHODS),
  // Manual counter-quote (Phase 2) - true while this booking has a quote
  // (see quotes table) still awaiting the customer's accept/decline. Lets
  // the dashboard list and Booking Detail surface "Quote received" without
  // a second fetch; computed in bookings.model.js, not stored.
  hasPendingQuote: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  // Booking Detail's status timeline (Requested/Accepted/Job Started/
  // Completed) - each null until its transition happens, same idiom as
  // completedAt below.
  acceptedAt: z.string().datetime().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// A customer directly booking a specific worker for one or more of their
// listed services (multi-select on Worker Detail) - manual booking only
// (Phase 2). Prices aren't submitted by the client: the backend looks up
// the worker's current price for each serviceId so it can't be tampered
// with.
// scheduledFor/responseDeadlineHours are both optional but must be given
// together - present, this is a scheduled request against a future
// date/time with a response deadline (business plan §13); absent, it's an
// urgent "now" booking, unchanged from before. scheduledFor must be in the
// future - checked against the client's own clock here as a first pass,
// with the server re-checking against its own clock in bookings.service.js.
export const BookingCreateInputSchema = z
  .object({
    workerId: z.number().int().positive(),
    serviceIds: z.array(z.number().int().positive()).min(1),
    addressLabel: z.string().min(3).max(200),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    // The picked address's district, when known (see AddressPicker.jsx) -
    // used to district-filter matching before radius (Part B). Optional/
    // nullable since a freeform one-off address may not have one.
    district: z.string().max(60).nullable().optional(),
    scheduledFor: z.string().datetime().optional(),
    responseDeadlineHours: z
      .number()
      .int()
      .refine((h) => RESPONSE_DEADLINE_HOURS.includes(h), { message: 'Must be one of 1, 6, or 24 hours' })
      .optional(),
  })
  .refine((b) => Boolean(b.scheduledFor) === Boolean(b.responseDeadlineHours), {
    message: 'scheduledFor and responseDeadlineHours must be provided together',
    path: ['responseDeadlineHours'],
  })
  .refine((b) => !b.scheduledFor || new Date(b.scheduledFor) > new Date(), {
    message: 'scheduledFor must be in the future',
    path: ['scheduledFor'],
  });

export const BookingCancelInputSchema = z.object({
  reason: z.string().max(300).nullable().optional(),
});

// Phase 3a (2026-09-29): the price is locked at completion, not freely
// editable - it's whatever was already agreed in-app (the original listed
// price, or an accepted counter-quote/price-increase amount, both already
// on bookings.price by the time this runs). The only way to change it here
// is an optional discount, which needs a reason and gets durably logged
// (see bookingDiscounts.model.js) - a price increase instead goes through
// the quotes flow (submit a 'price_increase' quote, customer must accept
// it) before this endpoint can even be called. paymentMethod only accepts
// 'cash' for now - eSewa is a disabled UI placeholder (business plan §6),
// not a real option yet, so the server rejects it even though
// bookings.paymentMethod can represent it once the gateway exists.
export const CompleteBookingInputSchema = z.object({
  paymentMethod: z.literal('cash').default('cash'),
  discount: z
    .object({
      discountedPrice: z.number().nonnegative(),
      reason: z.string().min(1).max(300),
    })
    .optional(),
});

// An instant request has no chosen worker - lat/lng are required (not
// optional like the manual flow's) since matching nearby online workers
// depends on them. Matching requires a worker who offers every requested
// service, not just one of them.
export const InstantBookingCreateInputSchema = z.object({
  serviceIds: z.array(z.number().int().positive()).min(1),
  addressLabel: z.string().min(3).max(200),
  latitude: z.number(),
  longitude: z.number(),
  district: z.string().max(60).nullable().optional(),
});

// Self-service "Report a problem" on a booking's own detail screen - the
// customer/worker-facing counterpart to AdminDisputeCreateInputSchema
// (admin.schema.js), which an admin uses to log one on a party's behalf.
// bookingId/raisedByUserId come from the route param and req.user.id, not
// the body, since the reporter can only ever be reporting themselves.
export const BookingDisputeInputSchema = z.object({
  reason: z.string().min(1).max(1000),
});

// BookingRequest.jsx's pre-booking price breakdown (Piece D, 2026-09-27) -
// a customer has picked a worker and an address but hasn't submitted yet,
// so the fuel charge is quoted without ever exposing the worker's raw
// saved coordinates back to the client (same privacy principle as the
// phone-scoping/trust-score raw-score rules elsewhere in this codebase).
// latitude/longitude are nullable (bug-fix round, 2026-09-29): the fuel
// charge is now a flat platform-wide fee regardless of distance (see
// bookings.service.js computeFuelCharge's FLAT_FUEL_CHARGE), and a one-off
// address (AddressPicker.jsx) doesn't always have coordinates - the
// frontend quotes as soon as any address is picked, not just one with a
// captured location.
export const FuelChargeQuoteInputSchema = z.object({
  workerId: z.number().int().positive(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const BookingOfferSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  status: z.enum(BOOKING_OFFER_STATUSES),
  notifiedAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable().optional(),
});
