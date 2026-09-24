import { z } from 'zod';
import { VERIFICATION_STATUSES, TRUST_TIERS } from './enums.js';

// One row per worker in search results - their cheapest service matching
// the search filters, not their full service list (that's on the detail
// screen). Keeps the results list scannable: one card, one headline price.
export const WorkerSearchResultSchema = z.object({
  userId: z.number().int().positive(),
  fullName: z.string(),
  handle: z.string().max(10).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  ratingAvg: z.number().min(0).max(5),
  jobsCompletedCount: z.number().int().min(0),
  serviceAreaLabel: z.string().nullable().optional(),
  trustTier: z.enum(TRUST_TIERS),
  typicalResponseHours: z.number().int().min(1).max(72).nullable().optional(),
  matchedService: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    price: z.number().positive(),
  }),
});

export const WorkerDetailServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  category: z.string(),
  price: z.number().positive(),
});

export const WorkerReviewSchema = z.object({
  id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  customerName: z.string(),
});

export const WorkerDetailSchema = z.object({
  userId: z.number().int().positive(),
  fullName: z.string(),
  handle: z.string().max(10).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  bio: z.string().nullable().optional(),
  ratingAvg: z.number().min(0).max(5),
  jobsCompletedCount: z.number().int().min(0),
  serviceAreaLabel: z.string().nullable().optional(),
  trustTier: z.enum(TRUST_TIERS),
  typicalResponseHours: z.number().int().min(1).max(72).nullable().optional(),
  services: z.array(WorkerDetailServiceSchema),
  // A real COUNT(*) from reviews (joined through bookings), not capped by
  // how many review rows are actually returned below.
  reviewsCount: z.number().int().min(0).default(0),
  reviews: z.array(WorkerReviewSchema).default([]),
});
