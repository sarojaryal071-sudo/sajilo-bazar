import { z } from 'zod';

export const ServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(80), // e.g. "Pipe leak repair"
  category: z.string().min(2).max(60), // e.g. "Plumbing"
  iconKey: z.string().max(60).nullable().optional(), // maps to a local icon asset, not a URL
  isActive: z.boolean().optional(), // admin catalog view only (Round B)
});
