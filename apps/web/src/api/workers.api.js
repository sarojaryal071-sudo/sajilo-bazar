import { apiFetch } from './client.js';

export function getServiceCatalog() {
  return apiFetch('/workers/catalog/services');
}

export function getMyWorkerData() {
  return apiFetch('/workers/me');
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
