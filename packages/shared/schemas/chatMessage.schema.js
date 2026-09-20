import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  senderId: z.number().int().positive(),
  message: z.string().min(1).max(2000),
  createdAt: z.string().datetime().optional(),
});

export const ChatMessageCreateInputSchema = z.object({
  message: z.string().min(1).max(2000),
});
