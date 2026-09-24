import { z } from 'zod';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:MM", 24h

// A worker's weekly recurring availability block - dayOfWeek follows JS
// Date#getDay() (0 = Sunday .. 6 = Saturday), matching apps/api/src/lib/
// availability.js so no translation is needed on either side.
export const AvailabilityBlockSchema = z
  .object({
    id: z.number().int().positive().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_RE, 'Use 24-hour HH:MM'),
    endTime: z.string().regex(TIME_RE, 'Use 24-hour HH:MM'),
  })
  .refine((b) => b.endTime > b.startTime, { message: 'endTime must be after startTime', path: ['endTime'] });

// Replace-all, same pattern as the worker-apply flow's services list - the
// full weekly schedule is submitted and saved as one set. 21 is a generous
// cap (3 blocks/day * 7 days), not a real product limit.
export const AvailabilityReplaceInputSchema = z.object({
  blocks: z.array(AvailabilityBlockSchema).max(21),
});

export const TypicalResponseHoursInputSchema = z.object({
  hours: z.number().int().min(1).max(72).nullable(),
});
