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
  createdAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const BookingOfferSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  status: z.enum(BOOKING_OFFER_STATUSES),
  notifiedAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable().optional(),
});
