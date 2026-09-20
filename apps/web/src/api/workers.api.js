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
