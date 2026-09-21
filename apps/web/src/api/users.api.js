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
