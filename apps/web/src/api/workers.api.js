import { apiFetch } from './client.js';

// category: only that category's services (with price-band hints) - the
// onboarding pricing step (Step 2c) uses this; the plain no-arg call
// (search's service picker, etc.) is unchanged.
export function getServiceCatalog(category) {
  return apiFetch(`/workers/catalog/services${category ? `?category=${encodeURIComponent(category)}` : ''}`);
}

export function getCategories() {
  return apiFetch('/workers/catalog/categories');
}

// Fixed, DB-seeded list (districts table) - onboarding Step 2a and the
// customer address form's district select both read from this.
export function getDistricts() {
  return apiFetch('/workers/catalog/districts');
}

export function search({ category, serviceId, q, district } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (serviceId) params.set('serviceId', serviceId);
  if (q) params.set('q', q);
  if (district) params.set('district', district);
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

// Profile page inline-edit (UI round) - the original onboarding bio field.
export function updateBio(bio) {
  return apiFetch('/workers/me/bio', { method: 'PATCH', body: { bio } });
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

// Onboarding Step 2's early-save: district + chosen services/pricing,
// saved as soon as the worker finishes the three tap-and-advance
// sub-screens - well before documents/submit. Returns the same shape as
// getMyWorkerData, so the caller can drive the resume-step decision off it.
export function saveOnboardingWork({ district, services }) {
  return apiFetch('/workers/me/onboarding/work', { method: 'PATCH', body: { district, services } });
}

// documents: { citizenshipFront, citizenshipBack, profilePhoto, skillCertificate? } (Files), bio: string
export function apply({ bio, documents }) {
  const formData = new FormData();
  if (bio) formData.append('bio', bio);
  for (const [field, file] of Object.entries(documents)) {
    if (file) formData.append(field, file);
  }
  return apiFetch('/workers/apply', { method: 'POST', body: formData, isFormData: true });
}

// Fixing one admin-rejected document (e.g. "citizenship_front") rather
// than the full apply() flow - only works when that document is currently
// rejected (see workers.service.js resubmitDocument).
export function resubmitDocument(docType, file) {
  const formData = new FormData();
  formData.append('document', file);
  return apiFetch(`/workers/me/documents/${docType}`, { method: 'PATCH', body: formData, isFormData: true });
}
