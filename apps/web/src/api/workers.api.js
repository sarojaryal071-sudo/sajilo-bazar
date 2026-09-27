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

// pool: 'top_rated' | 'new_workers' - Home's two featured-worker rows.
export function getFeatured(pool) {
  return apiFetch(`/workers/featured?pool=${pool}`);
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

export function getAvailability() {
  return apiFetch('/workers/me/availability');
}

// blocks: [{ dayOfWeek: 0-6, startTime: 'HH:MM', endTime: 'HH:MM' }] - replace-all.
export function setAvailability(blocks) {
  return apiFetch('/workers/me/availability', { method: 'PUT', body: { blocks } });
}

export function setTypicalResponseHours(hours) {
  return apiFetch('/workers/me/response-time', { method: 'PATCH', body: { hours } });
}

// Free-text, unstructured (2026-09-27) - sits alongside bio, edited from
// Profile.jsx.
export function updateDescription(description) {
  return apiFetch('/workers/me/description', { method: 'PATCH', body: { description } });
}

export function listPortfolio() {
  return apiFetch('/workers/me/portfolio');
}

// images: File[] - always multipart since images ride alongside.
export function createPortfolioItem({ title, description, link, category, workDate, images }) {
  const formData = new FormData();
  formData.append('title', title);
  if (description) formData.append('description', description);
  if (link) formData.append('link', link);
  formData.append('category', category);
  if (workDate) formData.append('workDate', workDate);
  for (const file of images || []) formData.append('images', file);
  return apiFetch('/workers/me/portfolio', { method: 'POST', body: formData, isFormData: true });
}

// existingImageUrls: string[] - whichever of the item's current images the
// worker chose to keep (dropping one from this list is how it's removed);
// newImages: File[] appended to that set server-side.
export function updatePortfolioItem(id, { title, description, link, category, workDate, existingImageUrls, newImages }) {
  const formData = new FormData();
  formData.append('title', title);
  if (description) formData.append('description', description);
  if (link) formData.append('link', link);
  formData.append('category', category);
  if (workDate) formData.append('workDate', workDate);
  formData.append('existingImageUrls', JSON.stringify(existingImageUrls || []));
  for (const file of newImages || []) formData.append('images', file);
  return apiFetch(`/workers/me/portfolio/${id}`, { method: 'PATCH', body: formData, isFormData: true });
}

export function deletePortfolioItem(id) {
  return apiFetch(`/workers/me/portfolio/${id}`, { method: 'DELETE' });
}

// orderedIds: number[] - the full desired order, replace-all.
export function reorderPortfolio(orderedIds) {
  return apiFetch('/workers/me/portfolio/reorder', { method: 'PUT', body: { orderedIds } });
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
