import { apiFetch } from './client.js';

export function getServiceCatalog() {
  return apiFetch('/workers/catalog/services');
}

export function search({ category, serviceId, q } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (serviceId) params.set('serviceId', serviceId);
  if (q) params.set('q', q);
  const query = params.toString();
  return apiFetch(`/workers/search${query ? `?${query}` : ''}`);
}

export function getDetail(userId) {
  return apiFetch(`/workers/${userId}`);
}

export function getMyWorkerData() {
  return apiFetch('/workers/me');
}

export function setOnline({ isOnline, latitude, longitude }) {
  return apiFetch('/workers/me/online', { method: 'PATCH', body: { isOnline, latitude, longitude } });
}

// Marks the one-time post-approval welcome as shown - idempotent, safe to
// call more than once (a no-op after the first).
export function ackWelcome() {
  return apiFetch('/workers/me/welcome', { method: 'PATCH' });
}

// Adding a service beyond what was registered at signup - serviceId picked
// from the catalog only, never free-text. Same category as an already
// approved service goes live immediately; a different category comes back
// pending until admin review. document is only required (and only used)
// when the picked service's category is high-risk and outside the
// worker's verified category(ies) - see AddServiceModal.jsx. Always
// multipart since the document rides along optionally.
export function addService({ serviceId, price, document }) {
  const formData = new FormData();
  formData.append('serviceId', serviceId);
  formData.append('price', price);
  if (document) formData.append('document', document);
  return apiFetch('/workers/me/services', { method: 'POST', body: formData, isFormData: true });
}

// services: [{ serviceId, price }], documents: { citizenship: File, certificate?: File }, bio: string
export function apply({ bio, services, documents }) {
  const formData = new FormData();
  if (bio) formData.append('bio', bio);
  formData.append('services', JSON.stringify(services));
  for (const [docType, file] of Object.entries(documents)) {
    if (file) formData.append(docType, file);
  }
  return apiFetch('/workers/apply', { method: 'POST', body: formData, isFormData: true });
}
