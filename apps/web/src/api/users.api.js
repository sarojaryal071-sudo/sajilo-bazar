import { apiFetch } from './client.js';

export function getMe() {
  return apiFetch('/users/me');
}

export function updateMe(input) {
  return apiFetch('/users/me', { method: 'PATCH', body: input });
}

export function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  return apiFetch('/users/me/photo', { method: 'POST', body: formData, isFormData: true });
}

export function createSupportTicket({ subject, message }) {
  return apiFetch('/users/me/support-tickets', { method: 'POST', body: { subject, message } });
}

export function deactivateAccount() {
  return apiFetch('/users/me/deactivate', { method: 'POST' });
}

export function deleteAccount() {
  return apiFetch('/users/me/delete', { method: 'POST', body: { confirm: 'DELETE' } });
}

export function linkGoogleAccount(idToken) {
  return apiFetch('/users/me/google', { method: 'POST', body: { idToken } });
}

export function unlinkGoogleAccount() {
  return apiFetch('/users/me/google', { method: 'DELETE' });
}
