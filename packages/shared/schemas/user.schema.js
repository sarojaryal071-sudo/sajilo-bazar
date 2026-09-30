import { z } from 'zod';
import { USER_ROLES, MODERATION_STATUSES, VERIFICATION_STATUSES } from './enums.js';

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
  // True once a real SMS/OTP flow verifies it - that flow doesn't exist yet
  // (deferred), so this is false for every account today, Google-signup or
  // phone+password alike. Exists now purely as the flag a later OTP round
  // flips, not as a claim anything is currently verified.
  phoneVerified: z.boolean().default(false),
  email: z.string().email().nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  moderationStatus: z.enum(MODERATION_STATUSES).default('active'),
  googleId: z.string().nullable().optional(),
  hasPassword: z.boolean().optional(),
  // Only present for role='worker' (see users.model.js
  // attachWorkerVerificationStatus) - what AppShell.jsx keys the
  // restricted (Help+Logout only) onboarding nav off of.
  verificationStatus: z.enum(VERIFICATION_STATUSES).nullable().optional(),
  // Reversible (Settings -> Deactivate account, cleared automatically the
  // next time this user logs in) vs. deletedAt, which never clears - see
  // users.model.js anonymize.
  deactivatedAt: z.string().datetime().nullable().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  // Set when an admin issues a temp password via the document-based
  // password-reset flow (target-spec Phase 9/10, Users & Verification) -
  // AppShell reads this the same way it already reads verificationStatus,
  // to force the change-password screen before anything else is reachable.
  mustChangePassword: z.boolean().optional(),
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
  // "Keep me logged in" - a longer-lived token instead of the default
  // expiry. See auth.service.js issueToken.
  keepLoggedIn: z.boolean().optional().default(false),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

// Sent by the frontend after Google Identity Services returns a signed ID
// token - the backend verifies it server-side (google-auth-library) rather
// than trusting anything about the user's identity from the client.
export const GoogleAuthInputSchema = z.object({
  idToken: z.string().min(1),
});

// Returned instead of a normal AuthResponse when a Google sign-in belongs
// to no existing account: pendingToken is a short-lived, server-signed JWT
// (see auth.service.js) carrying the verified Google identity, so the
// phone/role collected next can't be forged by the client - only the
// Google-verified sub/email travel forward, not anything the client
// supplies about who they are.
export const GoogleAuthPendingSchema = z.object({
  needsPhone: z.literal(true),
  pendingToken: z.string(),
  fullName: z.string(),
  email: z.string().email().nullable(),
});

export const GoogleCompleteSignupInputSchema = z.object({
  pendingToken: z.string().min(1),
  phone: phoneSchema,
  role: z.enum(['customer', 'worker']),
});

// "Forgot password" (business-accepted, no OTP/email verification for this
// testing phase - see docs/PROJECT_INDEX.md). confirmPassword is checked
// client-side only; the server only ever needs the final value.
export const ForgotPasswordInputSchema = z.object({
  phone: phoneSchema,
  newPassword: z.string().min(8).max(72),
});

// Document-based password reset for locked-out workers (target-spec Phase
// 9/10) - no SMS/OTP in this app, so a worker who can't log in submits
// their phone; an admin confirms identity against the same verification
// documents already on file and issues a temp password. The forgotPassword
// flow above stays exactly as-is (still open, still used by Settings ->
// "Change password" and by staff resets) - this is a separate, reviewed
// path, not a replacement.
export const PasswordResetRequestInputSchema = z.object({
  phone: phoneSchema,
});

// The forced-change screen a worker lands on after logging in with a temp
// password (mustChangePassword true) - the one authenticated
// change-password endpoint in this app. Deliberately just newPassword, no
// currentPassword field: requireAuth already proves they hold the temp
// password's token, and asking them to retype the temp password they were
// just handed is friction the JWT already removes the need for.
export const ChangePasswordInputSchema = z.object({
  newPassword: z.string().min(8).max(72),
});

export const ProfileUpdateInputSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
});

// Settings -> Account -> "Connected Google account". Same server-side
// verification path as sign-in (google-auth-library) - the client never
// gets to assert whose Google account this is.
export const GoogleLinkInputSchema = z.object({
  idToken: z.string().min(1),
});

// Settings -> Account -> "Delete account". Irreversible (unlike Deactivate,
// which needs no payload), so this requires the user to type the literal
// word as a lightweight are-you-sure - not real authentication, just
// friction proportional to the fact that this can't be undone.
export const DeleteAccountInputSchema = z.object({
  confirm: z.literal('DELETE'),
});
