import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

// Left by the customer, only once a booking is completed - see reviews module
// for the "already reviewed" / "not completed yet" checks.
export const ReviewCreateInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).nullable().optional(),
});
