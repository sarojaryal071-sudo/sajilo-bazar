import { z } from 'zod';
import { NOTIFICATION_TYPES } from './enums.js';

export const NotificationSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: z.enum(NOTIFICATION_TYPES),
  payload: z.record(z.any()).default({}),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
