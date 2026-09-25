import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../middleware/error.middleware.js';
import * as authModel from './auth.model.js';

const SALT_ROUNDS = 10;

// A short-lived, single-purpose token type distinct from a real session
// token (no "role" claim, never accepted by requireAuth's route guards -
// it's only ever read back by completeGoogleSignup below, from the request
// body, never as a Bearer token). Keeps the Google-verified identity
// (sub/email/name) tamper-proof across the "collect phone + role" round
// trip without a server-side pending-signup table.
const GOOGLE_PENDING_TOKEN_TYPE = 'google_pending';
const GOOGLE_PENDING_EXPIRES_IN = '15m';

let googleClient = null;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, 'Google sign-in is not configured on this server');
  }
  if (!googleClient) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
}

function issueToken(user, { keepLoggedIn = false } = {}) {
  const expiresIn = keepLoggedIn
    ? process.env.JWT_EXPIRES_IN_KEEP_LOGGED_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn });
}

// A deleted account's row still exists (anonymized, not dropped - see
// users.model.js anonymize), so it must never be distinguishable from "no
// such account" at login. A deactivated account is the opposite: logging
// back in through any of the three login paths below is itself the
// reactivation action (Settings -> Deactivate account's "reversible" half),
// so this clears it and returns the refreshed user for issueToken.
async function assertLoginAllowedAndReactivate(user) {
  if (user.deletedAt) throw new ApiError(401, 'Invalid phone number or password');
  if (user.moderationStatus === 'suspended') throw new ApiError(403, 'This account has been suspended');
  if (user.deactivatedAt) {
    const reactivated = await authModel.reactivate(user.id);
    return reactivated ?? user;
  }
  return user;
}

export async function signup({ fullName, phone, email, password, role }) {
  const existing = await authModel.findByPhone(phone);
  if (existing) throw new ApiError(409, 'An account with this phone number already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authModel.createUser({ fullName, phone, email, passwordHash, role });
  return { token: issueToken(user), user };
}

export async function login({ phone, password, keepLoggedIn }) {
  const user = await authModel.findByPhoneWithPassword(phone);
  // A Google-only account has no password_hash yet (bcrypt.compare against
  // null/undefined would throw, not just fail) - same "invalid credentials"
  // response either way, so this isn't distinguishable from a wrong password.
  if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid phone number or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid phone number or password');

  const { passwordHash, ...safeUser } = await assertLoginAllowedAndReactivate(user);
  return { token: issueToken(safeUser, { keepLoggedIn }), user: safeUser };
}

// Verifies the Google ID token server-side (never trusts a client-supplied
// identity), then: an existing Google-linked account logs straight in; an
// existing phone+password account sharing the same (Google-verified) email
// gets linked and logged in; anything else is a brand-new signup that still
// needs a phone number and role, so it doesn't create a user row yet - it
// hands back a pending token for completeGoogleSignup to finish.
export async function googleAuth({ idToken }) {
  const client = getGoogleClient();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google sign-in');
  }

  const { sub: googleId, email, name, email_verified: emailVerified } = payload;

  const byGoogleId = await authModel.findByGoogleId(googleId);
  if (byGoogleId) {
    const activeUser = await assertLoginAllowedAndReactivate(byGoogleId);
    return { token: issueToken(activeUser), user: activeUser };
  }

  if (email && emailVerified) {
    const byEmail = await authModel.findByEmail(email);
    if (byEmail) {
      const linked = await authModel.linkGoogleId(byEmail.id, googleId);
      const activeUser = await assertLoginAllowedAndReactivate(linked);
      return { token: issueToken(activeUser), user: activeUser };
    }
  }

  const pendingToken = jwt.sign(
    { type: GOOGLE_PENDING_TOKEN_TYPE, googleId, email: email ?? null, fullName: name ?? '' },
    process.env.JWT_SECRET,
    { expiresIn: GOOGLE_PENDING_EXPIRES_IN }
  );
  return { needsPhone: true, pendingToken, fullName: name ?? '', email: email ?? null };
}

export async function completeGoogleSignup({ pendingToken, phone, role }) {
  let claims;
  try {
    claims = jwt.verify(pendingToken, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'This sign-in has expired - please try "Continue with Google" again');
  }
  if (claims.type !== GOOGLE_PENDING_TOKEN_TYPE) {
    throw new ApiError(401, 'This sign-in has expired - please try "Continue with Google" again');
  }

  const existingPhone = await authModel.findByPhone(phone);
  if (existingPhone) throw new ApiError(409, 'An account with this phone number already exists');
  const existingGoogleId = await authModel.findByGoogleId(claims.googleId);
  if (existingGoogleId) throw new ApiError(409, 'This Google account is already linked to a Sajilo Bazar account');

  const user = await authModel.createUser({
    fullName: claims.fullName || 'Sajilo Bazar user',
    phone,
    email: claims.email,
    role,
    googleId: claims.googleId,
  });
  return { token: issueToken(user), user };
}

// Deliberately open for this testing/pre-launch phase: phone number in,
// new password out, no OTP/email/admin verification of ownership. An
// accepted, documented risk - not a gap to flag or "fix" later without
// being asked (see docs/WORKING_AGREEMENT.md task history). Also how a
// Google-only account (no password yet) gains its first password.
export async function forgotPassword({ phone, newPassword }) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const user = await authModel.updatePasswordByPhone(phone, passwordHash);
  if (!user) throw new ApiError(404, 'No account found with that phone number');

  // Logs the user straight in after the reset - a second manual login
  // immediately after setting the password they just chose would be
  // needless friction.
  const activeUser = await assertLoginAllowedAndReactivate(user);
  return { token: issueToken(activeUser), user: activeUser };
}
