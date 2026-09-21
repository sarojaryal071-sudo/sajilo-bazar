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
