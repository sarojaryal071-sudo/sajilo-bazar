import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  senderId: z.number().int().positive(),
  // A message is text, an attachment, or both - see chat_messages_has_content
  // in migration 023 for the "at least one" constraint this mirrors.
  message: z.string().max(2000).nullable(),
  attachmentUrl: z.string().url().nullable().optional(),
  attachmentType: z.enum(['image', 'pdf']).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export const ChatMessageCreateInputSchema = z.object({
  message: z.string().min(1).max(2000),
});
