import { z } from 'zod';

// Admin Users detail screen (Phase 6, Round A) - a single free-text note,
// no authorship/history tracking (see DATA_MODEL.md's users.admin_notes).
export const AdminUserNotesInputSchema = z.object({
  notes: z.string().max(2000).nullable(),
});

// Admin Bookings detail screen actions.
export const AdminBookingCancelInputSchema = z.object({
  reason: z.string().min(1).max(300),
});

export const AdminBookingFlagInputSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().max(300).nullable().optional(),
});

// Admin Categories/Services screen (Round B). Same shape for create and
// edit - editing a service's category re-groups it in the catalog.
export const AdminServiceInputSchema = z.object({
  category: z.string().min(2).max(60),
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
});
