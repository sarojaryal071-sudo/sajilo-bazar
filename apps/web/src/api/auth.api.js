import { apiFetch } from './client.js';

export function signup(input) {
  return apiFetch('/auth/signup', { method: 'POST', body: input });
}

export function login(input) {
  return apiFetch('/auth/login', { method: 'POST', body: input });
}

// Result is either { token, user } (existing/linked account - logged in
// immediately) or { needsPhone: true, pendingToken, fullName, email } (new
// account - see completeGoogleSignup).
export function google(idToken) {
  return apiFetch('/auth/google', { method: 'POST', body: { idToken } });
}

export function completeGoogleSignup({ pendingToken, phone, role, termsAccepted }) {
  return apiFetch('/auth/google/complete', { method: 'POST', body: { pendingToken, phone, role, termsAccepted } });
}

export function forgotPassword({ phone, newPassword }) {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: { phone, newPassword } });
}

// Document-based password reset for locked-out workers (target-spec Phase
// 9/10) - public, submits into the admin-reviewed queue instead of
// resetting immediately.
export function requestPasswordReset({ phone }) {
  return apiFetch('/auth/password-reset-requests', { method: 'POST', body: { phone } });
}

// The forced-change screen after a temp-password login.
export function changePassword({ newPassword }) {
  return apiFetch('/auth/change-password', { method: 'POST', body: { newPassword } });
}
