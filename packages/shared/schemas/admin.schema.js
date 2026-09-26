import { z } from 'zod';
import { ADMIN_DEPARTMENTS } from './enums.js';

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

// atFault only means anything when status is 'resolved' - the service
// layer forces it to null for 'dismissed' (a dismissed dispute has no
// fault finding). 'worker' is what feeds the trust-score deduction and the
// rolling-30-day admin-review escalation (see trustScore module).
export const AdminDisputeResolveInputSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  atFault: z.enum(['worker', 'customer', 'none']).nullable().optional(),
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

// Manual escalation only (2026-09-27) - a support agent picks a new
// department from a dropdown; no automatic/keyword-based routing. Shared
// shape for both disputes and support tickets since the field is identical.
export const AdminEscalateInputSchema = z.object({
  department: z.enum(ADMIN_DEPARTMENTS),
});

// Admin Staff screen (Round E, 2026-09-27) - Super Admin creates a staff
// account and assigns its department grants in one step. isSuperAdmin
// bypasses department gating entirely; departments is ignored (but still
// validated) when it's true, same as the server-side access check does.
export const AdminStaffCreateInputSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  password: z.string().min(8),
  departments: z.array(z.enum(ADMIN_DEPARTMENTS)).default([]),
  isSuperAdmin: z.boolean().default(false),
});

// Editing an existing staff account's access only - name/phone/email/
// password changes go through the same self-service Settings flow every
// other account uses, not this screen.
export const AdminStaffAccessInputSchema = z.object({
  departments: z.array(z.enum(ADMIN_DEPARTMENTS)).default([]),
  isSuperAdmin: z.boolean().default(false),
});

// Admin Policies screen (Round D). Announcements' input schema moved to
// publication.schema.js (2026-09-25) as part of unifying Announcements +
// Promotions into one Publications flow - policies are a fixed set, never
// created or deleted from this screen, so they keep their own lighter
// input schema untouched.
export const AdminPolicyInputSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1),
});
