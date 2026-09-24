import { z } from 'zod';

// A running balance, not double-entry bookkeeping (see DATA_MODEL.md #11).
// creditBalanceAfter is negative when the worker owes the platform -
// there's no prepaid top-up flow until Phase 8's payment integration, so
// commission accrues as a debt rather than draining a prepaid credit.
export const CommissionLedgerEntrySchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  customerName: z.string().nullable().optional(),
  serviceNames: z.string(),
  jobPrice: z.number().positive(),
  commissionAmount: z.number().positive(),
  creditBalanceAfter: z.number(),
  createdAt: z.string().datetime().optional(),
});
