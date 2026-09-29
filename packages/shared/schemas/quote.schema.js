import { z } from 'zod';
import { QUOTE_STATUSES, QUOTE_CONTEXTS } from './enums.js';

// One quotes row serves both the manual counter-quote flow (Phase 2 - a
// single row, from the booking's already-assigned worker) and Get Quotes
// (Phase 3 - multiple rows, from any matching worker, on a booking with no
// worker_id yet). No mode flag here - see the 043 migration's comment.
export const QuoteSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  workerId: z.number().int().positive(),
  amount: z.number().positive(),
  message: z.string().max(500).nullable().optional(),
  // 'counter_offer' (Phase 2, booking still 'requested') vs
  // 'price_increase' (Phase 3a, booking already 'accepted'/'in_progress') -
  // derived server-side from the booking's status at submit time, never
  // client-supplied (see quotes.service.js submitQuote). See migration 048.
  context: z.enum(QUOTE_CONTEXTS),
  // Deliberately no photoUrl - same proxy-only rule as
  // VerificationDocumentSchema (see packages/shared/schemas/
  // verificationDocument.schema.js): the underlying Cloudinary URL never
  // reaches a client. hasPhoto is the only signal exposed; viewing goes
  // through GET /quotes/:id/photo, which streams it server-side after
  // checking the requester is a participant on the quote's booking.
  hasPhoto: z.boolean(),
  status: z.enum(QUOTE_STATUSES),
  // Enrichment for display, same public-safe fields workers.service.js's
  // withTrustTier already allows onto a search result - never phone (see
  // the phone-scoping rule this schema deliberately has no field for).
  workerName: z.string().nullable().optional(),
  workerImageUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// POST /bookings/:id/quotes - bookingId/workerId come from the route param
// and req.user.id, never the body. Photo (worker's own reference photo) is
// optional and multipart, alongside these JSON fields, same split as
// WorkerApplyInputSchema/its document files.
export const QuoteCreateInputSchema = z.object({
  amount: z.number().positive(),
  message: z.string().max(500).nullable().optional(),
});

// PATCH /quotes/:id - the customer accepting or declining a worker's quote.
// This only transitions the quote row's own status in Phase 1; assigning
// the worker to the booking, superseding sibling quotes, etc. is Phase 2/3
// business logic layered on top of this foundation, not implemented here.
export const QuoteDecisionInputSchema = z.object({
  decision: z.enum(['accept', 'decline']),
});
