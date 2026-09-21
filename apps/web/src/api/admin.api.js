import { apiFetch } from './client.js';

export function getDashboardStats() {
  return apiFetch('/admin/dashboard/stats');
}

export function getApprovalsQueue() {
  return apiFetch('/admin/approvals');
}

export function approveDocument(id) {
  return apiFetch(`/admin/approvals/documents/${id}/approve`, { method: 'PATCH' });
}

export function rejectDocument(id) {
  return apiFetch(`/admin/approvals/documents/${id}/reject`, { method: 'PATCH' });
}

export function approveService(id) {
  return apiFetch(`/admin/approvals/services/${id}/approve`, { method: 'PATCH' });
}

export function rejectService(id) {
  return apiFetch(`/admin/approvals/services/${id}/reject`, { method: 'PATCH' });
}

export function listUsers({ role, status, q } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const query = params.toString();
  return apiFetch(`/admin/users${query ? `?${query}` : ''}`);
}

export function getUserDetail(id) {
  return apiFetch(`/admin/users/${id}`);
}

export function suspendUser(id) {
  return apiFetch(`/admin/users/${id}/suspend`, { method: 'PATCH' });
}

export function reinstateUser(id) {
  return apiFetch(`/admin/users/${id}/reinstate`, { method: 'PATCH' });
}

export function setUserNotes(id, notes) {
  return apiFetch(`/admin/users/${id}/notes`, { method: 'PATCH', body: { notes } });
}

export function listBookings({ status, type, from, to } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/admin/bookings${query ? `?${query}` : ''}`);
}

export function getBookingDetail(id) {
  return apiFetch(`/admin/bookings/${id}`);
}

export function cancelBooking(id, reason) {
  return apiFetch(`/admin/bookings/${id}/cancel`, { method: 'PATCH', body: { reason } });
}

export function setBookingFlag(id, { flagged, reason }) {
  return apiFetch(`/admin/bookings/${id}/flag`, { method: 'PATCH', body: { flagged, reason } });
}
