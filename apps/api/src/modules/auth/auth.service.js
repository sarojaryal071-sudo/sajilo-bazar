import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../middleware/error.middleware.js';
import * as authModel from './auth.model.js';
import { attachWorkerVerificationStatus } from '../users/users.model.js';
import { logAudit } from '../auditLog/auditLog.service.js';
import * as passwordResetModel from '../passwordReset/passwordReset.model.js';

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

// Full name is deliberately NOT checked - multiple accounts can share a
// name. Phone/email uniqueness is also enforced at the DB level (see
// migration 001), but checking explicitly here is what turns a raw
// constraint violation into the friendly message a customer/worker
// actually sees, instead of a 500 with SQL error text.
export async function signup({ fullName, phone, email, password, role }) {
  const existingPhone = await authModel.findByPhone(phone);
  if (existingPhone) throw new ApiError(409, 'An account with this phone number already exists');

  if (email) {
    const existingEmail = await authModel.findByEmail(email);
    if (existingEmail) throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await attachWorkerVerificationStatus(
    await authModel.createUser({ fullName, phone, email, passwordHash, role })
  );
  return { token: issueToken(user), user };
}

// Login is logged to the audit trail only when the phone belongs to an
// existing admin/staff account - the Audit Log is a Staff & Access record,
// not a general security-monitoring system, and every customer/worker
// login would otherwise drown it. An unrecognized phone number logs
// nothing (there's no admin account to attribute the attempt to).
async function logAdminLoginOutcome(user, action) {
  if (user?.role === 'admin') {
    await logAudit({
      actorId: user.id,
      action,
      severity: action === 'auth.login_failed' ? 'medium' : 'low',
      targetType: 'user',
      targetId: user.id,
    });
  }
}

export async function login({ phone, password, keepLoggedIn }) {
  const user = await authModel.findByPhoneWithPassword(phone);
  // A Google-only account has no password_hash yet (bcrypt.compare against
  // null/undefined would throw, not just fail) - same "invalid credentials"
  // response either way, so this isn't distinguishable from a wrong password.
  if (!user || !user.passwordHash) {
    await logAdminLoginOutcome(user, 'auth.login_failed');
    throw new ApiError(401, 'Invalid phone number or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await logAdminLoginOutcome(user, 'auth.login_failed');
    throw new ApiError(401, 'Invalid phone number or password');
  }

  const { passwordHash, ...safeUser } = await assertLoginAllowedAndReactivate(user);
  // AppShell's restricted-onboarding-nav gate reads verificationStatus
  // straight off this response (see AppShell.jsx) - a worker resuming
  // onboarding via login, not just getMe(), needs it here too, or the
  // full nav leaks until the next refetch.
  const withStatus = await attachWorkerVerificationStatus(safeUser);
  await logAdminLoginOutcome(withStatus, 'auth.login_success');
  return { token: issueToken(withStatus, { keepLoggedIn }), user: withStatus };
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
    const activeUser = await attachWorkerVerificationStatus(await assertLoginAllowedAndReactivate(byGoogleId));
    return { token: issueToken(activeUser), user: activeUser };
  }

  if (email && emailVerified) {
    const byEmail = await authModel.findByEmail(email);
    if (byEmail) {
      const linked = await authModel.linkGoogleId(byEmail.id, googleId);
      const activeUser = await attachWorkerVerificationStatus(await assertLoginAllowedAndReactivate(linked));
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

  const user = await attachWorkerVerificationStatus(
    await authModel.createUser({
      fullName: claims.fullName || 'Sajilo Bazar user',
      phone,
      email: claims.email,
      role,
      googleId: claims.googleId,
    })
  );
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

  // Same admin-only scoping as login above, and for the same reason - this
  // flow is open to any phone number (no OTP yet, see the comment on this
  // function), so an admin/staff password reset here is the one case
  // worth a security-trail entry; a customer/worker resetting their own
  // password is routine self-service, not an audit-worthy event. Never
  // logs the new password itself, only that a reset happened.
  if (user.role === 'admin') {
    await logAudit({
      actorId: user.id,
      action: 'auth.password_reset',
      severity: 'high',
      targetType: 'user',
      targetId: user.id,
    });
  }

  // Logs the user straight in after the reset - a second manual login
  // immediately after setting the password they just chose would be
  // needless friction.
  const activeUser = await attachWorkerVerificationStatus(await assertLoginAllowedAndReactivate(user));
  return { token: issueToken(activeUser), user: activeUser };
}

// Document-based password reset for locked-out workers (target-spec Phase
// 9/10) - the alternative to the open forgotPassword above for a worker who
// wants an admin to actually verify identity first. Public (no requireAuth)
// for the same reason forgotPassword is: a locked-out worker has no token.
// Deliberately worker-only - a customer/admin locked out still has the open
// forgotPassword flow, and a queue an admin has to work through shouldn't
// fill up with accounts that don't need it.
export async function requestPasswordReset({ phone }) {
  const user = await authModel.findByPhone(phone);
  if (!user || user.role !== 'worker') {
    throw new ApiError(404, 'No worker account found with that phone number');
  }

  const existing = await passwordResetModel.findPendingByWorkerId(user.id);
  if (existing) return existing;

  return passwordResetModel.create(user.id);
}

// The forced-change screen after a temp-password login - requireAuth
// already proves req.user holds that temp password's token, so this just
// needs the new value. Clears must_change_password in the same statement
// (see auth.model.js updatePasswordAndClearMustChange).
export async function changePassword(userId, { newPassword }) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const user = await authModel.updatePasswordAndClearMustChange(userId, passwordHash);
  if (!user) throw new ApiError(404, 'User not found');
  return attachWorkerVerificationStatus(user);
}
