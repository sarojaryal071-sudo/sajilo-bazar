import { z } from 'zod';
import { USER_ROLES, MODERATION_STATUSES } from './enums.js';

// What a User looks like, everywhere: the backend validates requests
// against this, and the frontend uses it to shape mock data before the
// real API exists. Passwords never appear here - they're write-only on
// the signup schema below and never returned by the API.

// E.164: a leading "+", then 8-15 digits, first digit non-zero. Matches
// what the frontend's phone input always produces - see PhoneInput.jsx.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const phoneSchema = z
  .string()
  .regex(E164_REGEX, 'Enter a valid phone number, including the country code');

export const UserSchema = z.object({
  id: z.number().int().positive(),
  clientId: z.string(), // public-facing id shown to other users (e.g. "U1042")
  role: z.enum(USER_ROLES),
  fullName: z.string().min(2).max(120),
  phone: phoneSchema,
  email: z.string().email().nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  moderationStatus: z.enum(MODERATION_STATUSES).default('active'),
  createdAt: z.string().datetime().optional(),
});

export const SignupInputSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: phoneSchema,
  email: z.string().email().nullable().optional(),
  password: z.string().min(8).max(72),
  role: z.enum(['customer', 'worker']), // nobody signs up as admin
});

export const LoginInputSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

export const ProfileUpdateInputSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
});
