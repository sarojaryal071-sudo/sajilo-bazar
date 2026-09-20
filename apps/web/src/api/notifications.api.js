import { apiFetch } from './client.js';

export function list({ unreadOnly } = {}) {
  const query = unreadOnly ? '?unread=true' : '';
  return apiFetch(`/notifications${query}`);
}

export function getUnreadCount() {
  return apiFetch('/notifications/unread-count');
}

export function markRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}
