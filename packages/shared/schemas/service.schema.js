import { z } from 'zod';

export const ServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(80), // e.g. "Pipe leak repair"
  category: z.string().min(2).max(60), // e.g. "Plumbing"
  iconKey: z.string().max(60).nullable().optional(), // maps to a local icon asset, not a URL
  isActive: z.boolean().optional(), // admin catalog view only (Round B)
  // Admin-set, not hardcoded by category - gates whether a worker adding
  // this service outside their verified category must submit a
  // supporting document (see workerProfile.schema.js WorkerAddServiceInputSchema).
  highRisk: z.boolean().optional(),
  // Admin-editable band (platform_settings key 'service_price_bands', same
  // pattern as fuel pricing) - a hint only ("Typical: Rs. X-Y"), shown on
  // the worker-apply pricing step. Null when no band has been set for this
  // service yet. A price outside the band is still accepted, just flagged
  // into the admin document-review queue (see workers.service.js).
  minPrice: z.number().nullable().optional(),
  maxPrice: z.number().nullable().optional(),
});

// A supported district, seeded in the DB (districts table) rather than a
// hardcoded enum - same extensibility pattern services.category already
// uses. GET /districts returns these for the onboarding district picker
// and the customer address form's district select.
export const DistrictSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(60),
});
