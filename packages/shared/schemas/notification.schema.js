import { z } from 'zod';
import { NOTIFICATION_TYPES, NOTIFICATION_CATEGORIES } from './enums.js';

export const NotificationSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: z.enum(NOTIFICATION_TYPES),
  payload: z.record(z.any()).default({}),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

// Settings -> Notifications matrix. { bookings: true, chat: true, ... } -
// every category defaults to true (on) when no row exists yet for a user.
export const NotificationPreferencesSchema = z.record(z.enum(NOTIFICATION_CATEGORIES), z.boolean());

// One matrix cell toggled - only in_app is a real, persisted channel in
// this v1 (see notification_preferences migration).
export const NotificationPreferenceUpdateInputSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  inApp: z.boolean(),
});
