import { z } from 'zod';
import { DOCUMENT_STATUSES } from './enums.js';

export const VerificationDocumentSchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive(),
  docType: z.string().min(2).max(40), // e.g. "citizenship", "certificate"
  fileUrl: z.string().url(),
  status: z.enum(DOCUMENT_STATUSES).default('pending'),
  reviewedBy: z.number().int().positive().nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  reviewComment: z.string().max(500).nullable().optional(), // admin's reason, set on reject
  createdAt: z.string().datetime().optional(),
});

// What the worker-apply flow submits in one go: chosen services + pricing, plus
// at least one verification document. File upload itself is multipart, not JSON -
// this schema validates the non-file fields alongside it.
export const WorkerApplyInputSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  services: z
    .array(
      z.object({
        serviceId: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1),
});
