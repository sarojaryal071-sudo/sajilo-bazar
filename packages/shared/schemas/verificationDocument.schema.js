import { z } from 'zod';
import { DOCUMENT_STATUSES } from './enums.js';

export const VerificationDocumentSchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive(),
  docType: z.string().min(2).max(40), // e.g. "citizenship", "certificate"
  // Deliberately no fileUrl - the underlying Cloudinary URL never reaches
  // any client (worker or admin). Viewing a document goes through
  // GET /admin/documents/:id/file instead, which streams it server-side
  // after checking the requester is an authenticated admin.
  status: z.enum(DOCUMENT_STATUSES).default('pending'),
  reviewedBy: z.number().int().positive().nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  reviewComment: z.string().max(500).nullable().optional(), // admin's reason, set on reject
  // Set when this document is supporting evidence for a specific
  // high-risk cross-category service request rather than the original
  // worker-apply identity verification - see workerProfile.schema.js.
  workerServiceId: z.number().int().positive().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

// Onboarding Step 3/4's final submit: district + services were already
// saved earlier (see WorkerOnboardingWorkInputSchema) - this is just the
// remaining non-file fields, submitted alongside the required document
// files (citizenship front/back, profile photo, and skill_certificate when
// the worker's category is high_risk - see workers.service.js apply()).
// File upload itself is multipart, not JSON - this schema validates the
// non-file fields alongside it.
export const WorkerApplyInputSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
});
