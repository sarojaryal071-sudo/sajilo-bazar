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

export function rejectDocument(id, comment) {
  return apiFetch(`/admin/approvals/documents/${id}/reject`, { method: 'PATCH', body: { comment } });
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

export function getCategoriesOverview() {
  return apiFetch('/admin/categories');
}

export function createService({ category, name, description }) {
  return apiFetch('/admin/services', { method: 'POST', body: { category, name, description } });
}

export function updateService(id, { category, name, description }) {
  return apiFetch(`/admin/services/${id}`, { method: 'PATCH', body: { category, name, description } });
}

export function activateService(id) {
  return apiFetch(`/admin/services/${id}/activate`, { method: 'PATCH' });
}

export function deactivateService(id) {
  return apiFetch(`/admin/services/${id}/deactivate`, { method: 'PATCH' });
}

export function listDisputes({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  return apiFetch(`/admin/disputes${query ? `?${query}` : ''}`);
}

export function getDisputeDetail(id) {
  return apiFetch(`/admin/disputes/${id}`);
}

export function createDispute({ bookingId, raisedByUserId, reason }) {
  return apiFetch('/admin/disputes', { method: 'POST', body: { bookingId, raisedByUserId, reason } });
}

export function resolveDispute(id, { status, resolutionNotes }) {
  return apiFetch(`/admin/disputes/${id}/resolve`, { method: 'PATCH', body: { status, resolutionNotes } });
}

export function listSupportTickets({ status, priority, q } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (q) params.set('q', q);
  const query = params.toString();
  return apiFetch(`/admin/support-tickets${query ? `?${query}` : ''}`);
}

export function getSupportTicketDetail(id) {
  return apiFetch(`/admin/support-tickets/${id}`);
}

export function createSupportTicket({ userId, bookingId, subject, priority, message }) {
  return apiFetch('/admin/support-tickets', {
    method: 'POST',
    body: { userId, bookingId, subject, priority, message },
  });
}

export function replyToTicket(id, message) {
  return apiFetch(`/admin/support-tickets/${id}/messages`, { method: 'POST', body: { message } });
}

export function setTicketStatus(id, status) {
  return apiFetch(`/admin/support-tickets/${id}/status`, { method: 'PATCH', body: { status } });
}

export function listAnnouncements({ status, audience } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (audience) params.set('audience', audience);
  const query = params.toString();
  return apiFetch(`/admin/announcements${query ? `?${query}` : ''}`);
}

export function createAnnouncement(input) {
  return apiFetch('/admin/announcements', { method: 'POST', body: input });
}

export function updateAnnouncement(id, input) {
  return apiFetch(`/admin/announcements/${id}`, { method: 'PATCH', body: input });
}

export function publishAnnouncement(id) {
  return apiFetch(`/admin/announcements/${id}/publish`, { method: 'PATCH' });
}

export function unpublishAnnouncement(id) {
  return apiFetch(`/admin/announcements/${id}/unpublish`, { method: 'PATCH' });
}

export function listPolicies() {
  return apiFetch('/admin/policies');
}

export function updatePolicy(policyType, input) {
  return apiFetch(`/admin/policies/${policyType}`, { method: 'PATCH', body: input });
}

export function publishPolicy(policyType) {
  return apiFetch(`/admin/policies/${policyType}/publish`, { method: 'PATCH' });
}

export function unpublishPolicy(policyType) {
  return apiFetch(`/admin/policies/${policyType}/unpublish`, { method: 'PATCH' });
}
