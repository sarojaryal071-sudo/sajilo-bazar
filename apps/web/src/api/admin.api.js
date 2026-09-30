import { apiFetch, API_BASE, getToken } from './client.js';

export function getDashboardStats() {
  return apiFetch('/admin/dashboard/stats');
}

export function getAnalytics() {
  return apiFetch('/admin/analytics');
}

export function getDashboardInsights() {
  return apiFetch('/admin/dashboard/insights');
}

// Finance (lean, target-spec Phase 8/9)

export function getRevenueSummary(range) {
  const query = range ? `?range=${range}` : '';
  return apiFetch(`/admin/finance/revenue${query}`);
}

export function listExpenses() {
  return apiFetch('/admin/finance/expenses');
}

export function createExpense(input) {
  return apiFetch('/admin/finance/expenses', { method: 'POST', body: input });
}

export function updateExpense(id, input) {
  return apiFetch(`/admin/finance/expenses/${id}`, { method: 'PATCH', body: input });
}

export function payExpense(id) {
  return apiFetch(`/admin/finance/expenses/${id}/pay`, { method: 'PATCH' });
}

export function deleteExpense(id) {
  return apiFetch(`/admin/finance/expenses/${id}`, { method: 'DELETE' });
}

export function listPlatformSettings() {
  return apiFetch('/admin/settings');
}

export function updatePlatformSetting(key, value) {
  return apiFetch(`/admin/settings/${key}`, { method: 'PATCH', body: { value } });
}

export function listStaff() {
  return apiFetch('/admin/staff');
}

export function getStaffDetail(id) {
  return apiFetch(`/admin/staff/${id}`);
}

export function createStaff(input) {
  return apiFetch('/admin/staff', { method: 'POST', body: input });
}

export function updateStaffAccess(id, input) {
  return apiFetch(`/admin/staff/${id}/access`, { method: 'PATCH', body: input });
}

export function getAuditLog({ lens, severity, actorId, from, to } = {}) {
  const params = new URLSearchParams();
  if (lens) params.set('lens', lens);
  if (severity) params.set('severity', severity);
  if (actorId) params.set('actorId', actorId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/admin/audit-log${query ? `?${query}` : ''}`);
}

export function getApprovalsQueue() {
  return apiFetch('/admin/approvals');
}

// Not apiFetch - that always parses JSON, and these endpoints stream image
// bytes. Returns a Blob for the caller to turn into an object URL (see
// DocumentViewerModal.jsx) - the raw Cloudinary URL either proxy sits in
// front of never reaches this code at all, only the file's own bytes.
async function fetchAdminFile(path) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Could not load this file');
  return response.blob();
}

export function fetchDocumentFile(id) {
  return fetchAdminFile(`/api/admin/documents/${id}/file`);
}

export function fetchUserPhotoFile(id) {
  return fetchAdminFile(`/api/admin/users/${id}/photo`);
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

export function rejectService(id, comment) {
  return apiFetch(`/admin/approvals/services/${id}/reject`, { method: 'PATCH', body: { comment } });
}

// Returns { tempPassword } - shown to the admin exactly once.
export function approvePasswordReset(id) {
  return apiFetch(`/admin/approvals/password-resets/${id}/approve`, { method: 'PATCH' });
}

export function denyPasswordReset(id, reason) {
  return apiFetch(`/admin/approvals/password-resets/${id}/deny`, { method: 'PATCH', body: { reason } });
}

export function listUsers({ role, status, q, flagged, tier, sort } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  if (flagged) params.set('flagged', 'true');
  if (tier) params.set('tier', tier);
  if (sort) params.set('sort', sort);
  const query = params.toString();
  return apiFetch(`/admin/users${query ? `?${query}` : ''}`);
}

export function getUserDetail(id) {
  return apiFetch(`/admin/users/${id}`);
}

export function getUserPerformance(id) {
  return apiFetch(`/admin/users/${id}/performance`);
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

export function listBookings({ status, type, from, to, paymentMethod, paymentStatus } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
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

export function markServiceHighRisk(id) {
  return apiFetch(`/admin/services/${id}/mark-high-risk`, { method: 'PATCH' });
}

export function unmarkServiceHighRisk(id) {
  return apiFetch(`/admin/services/${id}/unmark-high-risk`, { method: 'PATCH' });
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

export function resolveDispute(id, { status, atFault, resolutionNotes }) {
  return apiFetch(`/admin/disputes/${id}/resolve`, { method: 'PATCH', body: { status, atFault, resolutionNotes } });
}

export function escalateDispute(id, department) {
  return apiFetch(`/admin/disputes/${id}/escalate`, { method: 'PATCH', body: { department } });
}

export function listSupportTickets({ status, priority, q } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (q) params.set('q', q);
  const query = params.toString();
  return apiFetch(`/admin/support-tickets${query ? `?${query}` : ''}`);
}

export function getLiveSupportChats({ status, role } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (role) params.set('role', role);
  const query = params.toString();
  return apiFetch(`/admin/support-chats${query ? `?${query}` : ''}`);
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

export function escalateTicket(id, department) {
  return apiFetch(`/admin/support-tickets/${id}/escalate`, { method: 'PATCH', body: { department } });
}

export function listPublications({ type, status, audience } = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (audience) params.set('audience', audience);
  const query = params.toString();
  return apiFetch(`/admin/publications${query ? `?${query}` : ''}`);
}

export function createPublication(input) {
  return apiFetch('/admin/publications', { method: 'POST', body: input });
}

export function updatePublication(id, input) {
  return apiFetch(`/admin/publications/${id}`, { method: 'PATCH', body: input });
}

export function publishPublication(id) {
  return apiFetch(`/admin/publications/${id}/publish`, { method: 'PATCH' });
}

export function unpublishPublication(id) {
  return apiFetch(`/admin/publications/${id}/unpublish`, { method: 'PATCH' });
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

export function listDistricts() {
  return apiFetch('/admin/districts');
}

export function createDistrict({ name, isActive }) {
  return apiFetch('/admin/districts', { method: 'POST', body: { name, isActive } });
}

export function activateDistrict(id) {
  return apiFetch(`/admin/districts/${id}/activate`, { method: 'PATCH' });
}

export function deactivateDistrict(id) {
  return apiFetch(`/admin/districts/${id}/deactivate`, { method: 'PATCH' });
}
