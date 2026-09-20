import { z } from 'zod';

// One row per worker in search results - their cheapest service matching
// the search filters, not their full service list (that's on the detail
// screen). Keeps the results list scannable: one card, one headline price.
export const WorkerSearchResultSchema = z.object({
  userId: z.number().int().positive(),
  fullName: z.string(),
  profileImageUrl: z.string().url().nullable().optional(),
  ratingAvg: z.number().min(0).max(5),
  jobsCompletedCount: z.number().int().min(0),
  serviceAreaLabel: z.string().nullable().optional(),
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

export const WorkerDetailSchema = z.object({
  userId: z.number().int().positive(),
  fullName: z.string(),
  profileImageUrl: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  ratingAvg: z.number().min(0).max(5),
  jobsCompletedCount: z.number().int().min(0),
  serviceAreaLabel: z.string().nullable().optional(),
  services: z.array(WorkerDetailServiceSchema),
  // No reviews module yet (Phase 2's manual-booking slice hasn't been built)
  // - always 0 for now, but present so the frontend renders it honestly
  // rather than needing a conditional.
  reviewsCount: z.number().int().min(0).default(0),
});
