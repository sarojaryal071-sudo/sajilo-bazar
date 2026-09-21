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
