import { z } from 'zod';
import { VERIFICATION_STATUSES, SERVICE_APPROVAL_STATUSES } from './enums.js';

export const WorkerProfileSchema = z.object({
  userId: z.number().int().positive(),
  bio: z.string().max(500).nullable().optional(),
  isOnline: z.boolean().default(false),
  verificationStatus: z.enum(VERIFICATION_STATUSES).default('unsubmitted'),
  ratingAvg: z.number().min(0).max(5).default(0),
  jobsCompletedCount: z.number().int().min(0).default(0),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  serviceAreaLabel: z.string().max(120).nullable().optional(), // e.g. "Baneshwor, Kathmandu"
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
