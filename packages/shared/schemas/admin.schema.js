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

// Admin Approvals screen - the reason shown back to the worker when a
// verification document is rejected.
export const AdminDocumentRejectInputSchema = z.object({
  comment: z.string().max(500).nullable().optional(),
});

// Admin Categories/Services screen (Round B). Same shape for create and
// edit - editing a service's category re-groups it in the catalog.
export const AdminServiceInputSchema = z.object({
  category: z.string().min(2).max(60),
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
});

// Admin Disputes + Support tickets (Round C). Neither has a customer/worker
// self-service "raise this" flow yet, so an admin logs the case directly -
// raisedByUserId/userId is whichever party the admin is logging it on
// behalf of, validated against the booking's parties in the service layer.
export const AdminDisputeCreateInputSchema = z.object({
  bookingId: z.number().int().positive(),
  raisedByUserId: z.number().int().positive(),
  reason: z.string().min(1).max(1000),
});

export const AdminDisputeResolveInputSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolutionNotes: z.string().max(2000).nullable().optional(),
});

export const AdminSupportTicketCreateInputSchema = z.object({
  userId: z.number().int().positive(),
  bookingId: z.number().int().positive().nullable().optional(),
  subject: z.string().min(1).max(160),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  message: z.string().min(1).max(2000),
});

export const AdminSupportTicketReplyInputSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const AdminSupportTicketStatusInputSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

// Admin Announcements + Policies (Round D) - one shared table/UI pattern,
// so one input schema for creating/editing an announcement and a lighter
// one for editing a policy's body (policies are a fixed set, never created
// or deleted from this screen).
export const AdminAnnouncementInputSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1),
  audience: z.enum(['all', 'customers', 'workers']),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const AdminPolicyInputSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1),
});
