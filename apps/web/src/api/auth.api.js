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

export function completeGoogleSignup({ pendingToken, phone, role }) {
  return apiFetch('/auth/google/complete', { method: 'POST', body: { pendingToken, phone, role } });
}

export function forgotPassword({ phone, newPassword }) {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: { phone, newPassword } });
}
