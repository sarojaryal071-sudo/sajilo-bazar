import { z } from 'zod';

// Self-service "Help & Support" form (hamburger menu, both roles) - the
// customer/worker-facing counterpart to AdminSupportTicketCreateInputSchema
// (admin.schema.js), which an admin uses to log one on a user's behalf.
// No bookingId here - this entry point is a general contact-support form,
// not tied to a specific booking. userId comes from req.user.id, and
// priority always defaults to 'normal' (only an admin triages priority).
export const SupportTicketCreateInputSchema = z.object({
  subject: z.string().min(1).max(160),
  message: z.string().min(1).max(2000),
});
