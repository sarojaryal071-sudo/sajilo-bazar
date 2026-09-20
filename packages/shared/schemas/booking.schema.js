import { z } from 'zod';
import { BOOKING_TYPES, BOOKING_STATUSES, BOOKING_OFFER_STATUSES } from './enums.js';

// Defined now for contract stability across phases, implemented in the
// Booking module (Phase 2-3 of the roadmap), not the Auth module.

export const BookingSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(BOOKING_TYPES),
  status: z.enum(BOOKING_STATUSES),
  customerId: z.number().int().positive(),
  workerId: z.number().int().positive().nullable(), // null until an instant request is accepted
  serviceId: z.number().int().positive(),
  price: z.number().positive().nullable(), // set by manual booking upfront, or by worker on completion
  addressLabel: z.string().max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  cancelledBy: z.number().int().positive().nullable().optional(),
  cancelReason: z.string().max(300).nullable().optional(),
  createdAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// A customer directly booking a specific worker for one of their listed
// services - manual booking only (Phase 2). Price isn't submitted by the
// client: the backend looks up the worker's current price for serviceId so
// it can't be tampered with.
export const BookingCreateInputSchema = z.object({
  workerId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  addressLabel: z.string().min(3).max(200),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const BookingCancelInputSchema = z.object({
  reason: z.string().max(300).nullable().optional(),
});

export const BookingOfferSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  status: z.enum(BOOKING_OFFER_STATUSES),
  notifiedAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable().optional(),
});
