import { z } from 'zod';
import { PUBLICATION_TYPES } from './enums.js';

// Admin Publications screen (2026-09-25 - replaces the old Announcements
// screen). One input schema for both types: type drives which fields the
// admin UI actually shows/requires (progressive disclosure), but the
// backend accepts the full shape either way and just ignores fields that
// don't apply to the chosen type (image/CTA are promotion-only in
// practice, never enforced at this layer).
export const AdminPublicationInputSchema = z.object({
  type: z.enum(PUBLICATION_TYPES),
  title: z.string().min(1).max(160),
  body: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
  ctaLabel: z.string().max(60).nullable().optional(),
  ctaLink: z.string().url().nullable().optional(),
  audience: z.enum(['all', 'customers', 'workers']),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  displayOrder: z.number().int().optional(),
});
