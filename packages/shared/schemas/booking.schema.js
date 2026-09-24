import { z } from 'zod';
import { BOOKING_TYPES, BOOKING_STATUSES, BOOKING_OFFER_STATUSES } from './enums.js';

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
  services: z.array(BookingServiceSchema).min(1),
  price: z.number().positive().nullable(), // denormalized sum of services[].price - null until every service is priced
  addressLabel: z.string().max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  cancelledBy: z.number().int().positive().nullable().optional(),
  cancelReason: z.string().max(300).nullable().optional(),
  createdAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// A customer directly booking a specific worker for one or more of their
// listed services (multi-select on Worker Detail) - manual booking only
// (Phase 2). Prices aren't submitted by the client: the backend looks up
// the worker's current price for each serviceId so it can't be tampered
// with.
export const BookingCreateInputSchema = z.object({
  workerId: z.number().int().positive(),
  serviceIds: z.array(z.number().int().positive()).min(1),
  addressLabel: z.string().min(3).max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const BookingCancelInputSchema = z.object({
  reason: z.string().max(300).nullable().optional(),
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
});

// Self-service "Report a problem" on a booking's own detail screen - the
// customer/worker-facing counterpart to AdminDisputeCreateInputSchema
// (admin.schema.js), which an admin uses to log one on a party's behalf.
// bookingId/raisedByUserId come from the route param and req.user.id, not
// the body, since the reporter can only ever be reporting themselves.
export const BookingDisputeInputSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const BookingOfferSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  status: z.enum(BOOKING_OFFER_STATUSES),
  notifiedAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable().optional(),
});
