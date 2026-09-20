import { apiFetch } from './client.js';

export function getMe() {
  return apiFetch('/users/me');
}

export function updateMe(input) {
  return apiFetch('/users/me', { method: 'PATCH', body: input });
}
