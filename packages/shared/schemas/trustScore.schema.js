import { z } from 'zod';
import { TRUST_TIERS } from './enums.js';

// Worker's own panel only (GET /trust-score/me) - the raw score, the
// per-factor breakdown, and the tips are never sent to a customer-facing
// endpoint. score/breakdown are null while inGracePeriod is true - a
// worker still in their grace period isn't scored against this yet.
export const TrustScoreSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  tier: z.enum(TRUST_TIERS),
  inGracePeriod: z.boolean(),
  breakdown: z
    .object({
      rating: z.number().int().min(0).max(100),
      reliability: z.number().int().min(0).max(100),
      tenure: z.number().int().min(0).max(100),
      disputes: z.number().int().min(0).max(100),
    })
    .nullable(),
  tips: z.array(z.string()),
});
