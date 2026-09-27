import { z } from 'zod';
import { VERIFICATION_STATUSES, SERVICE_APPROVAL_STATUSES } from './enums.js';

export const WorkerProfileSchema = z.object({
  userId: z.number().int().positive(),
  bio: z.string().max(500).nullable().optional(),
  // Free-text, unstructured (2026-09-27) - sits alongside bio rather than
  // replacing it. Deliberately not split into separate fields (what I do /
  // how I work / etc.) - see Profile.jsx's placeholder guidance text.
  description: z.string().max(2000).nullable().optional(),
  isOnline: z.boolean().default(false),
  verificationStatus: z.enum(VERIFICATION_STATUSES).default('unsubmitted'),
  ratingAvg: z.number().min(0).max(5).default(0),
  jobsCompletedCount: z.number().int().min(0).default(0),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  serviceAreaLabel: z.string().max(120).nullable().optional(), // e.g. "Baneshwor, Kathmandu"
  // Chosen at onboarding Step 2a from the fixed, DB-seeded districts list
  // (see districts table / GET /districts) - null until then, since the
  // worker_profiles row is created at signup, before onboarding runs.
  // Booking-matching filters by this before radius (see bookings.model.js
  // findNearbyOnlineWorkers / workers.model.js searchWorkers).
  district: z.string().max(60).nullable().optional(),
  // Auto-generated once first approved (e.g. "PL042") - null before then.
  handle: z.string().max(10).nullable().optional(),
  // Null until the one-time post-approval welcome moment has been shown.
  welcomedAt: z.string().datetime().nullable().optional(),
  // Self-reported only ("usually replies within Xh"), not computed/derived - optional.
  typicalResponseHours: z.number().int().min(1).max(72).nullable().optional(),
});

// Going online captures the worker's current coordinates (from the
// browser) so instant-request matching has something real to match
// against - going offline just flips the flag, no location needed.
export const WorkerOnlineInputSchema = z.object({
  isOnline: z.boolean(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const WorkerServiceSchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  serviceName: z.string().optional(), // denormalized for display, joined from services
  category: z.string().optional(), // denormalized for display, joined from services
  highRisk: z.boolean().optional(), // denormalized for display, joined from services
  price: z.number().positive(),
  isActive: z.boolean().default(true),
  approvalStatus: z.enum(SERVICE_APPROVAL_STATUSES).default('approved'),
  reviewComment: z.string().max(500).nullable().optional(), // admin's reason, set on reject
});

// A worker adding a service beyond what they registered with at signup -
// picked from the existing catalog by id only, never free-text name or
// description. Same-category-as-approved goes live immediately; a
// different category needs admin review (see workers.service.js). The
// request is always multipart (not pure JSON) since a high-risk
// cross-category add also carries an optional supporting document file -
// this schema validates the non-file fields alongside it.
export const WorkerAddServiceInputSchema = z.object({
  serviceId: z.number().int().positive(),
  price: z.number().positive(),
});

// Onboarding Step 2 ("Your work"): district + chosen services/pricing,
// saved together as soon as the worker finishes the three tap-and-advance
// sub-screens (2a district, 2b category, 2c services & pricing) - well
// before Step 3's documents or Step 4's final submit. This is the one new
// persistence checkpoint the resume behavior needs: a worker who logs back
// in after this point but before finishing Step 3/4 resumes straight into
// documents, not back at district/category/services.
export const WorkerOnboardingWorkInputSchema = z.object({
  district: z.string().min(2).max(60),
  services: z
    .array(
      z.object({
        serviceId: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1),
});

export const WorkerDescriptionInputSchema = z.object({
  description: z.string().max(2000).nullable(),
});

// A past-work item on a worker's portfolio (2026-09-27). No status field -
// self-serve, goes live immediately, same trust model as reviews (see
// DATA_MODEL.md). category reuses services.category's own free-text
// convention rather than a new enum, so a future non-household vertical
// doesn't need a schema change here.
export const WorkerPortfolioItemSchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  imageUrls: z.array(z.string().url()).default([]),
  link: z.string().url().nullable().optional(),
  category: z.string().min(2).max(60),
  workDate: z.string().nullable().optional(), // date-only (YYYY-MM-DD), worker-entered, informational
  displayOrder: z.number().int().min(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Non-file fields only - images ride alongside as multipart files (see
// workers.controller.js createPortfolioItem/updatePortfolioItem).
export const WorkerPortfolioItemInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  link: z.string().url().nullable().optional(),
  category: z.string().min(2).max(60),
  workDate: z.string().nullable().optional(),
});

// Replace-all, same idiom as AvailabilityReplaceInputSchema/
// replaceWorkerServices - the full desired order is always submitted as
// one set (display_order = each id's index), not incrementally patched.
export const WorkerPortfolioReorderInputSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});
