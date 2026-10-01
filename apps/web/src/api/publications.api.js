import { apiFetch } from './client.js';

// Live type='promotion' publications for the Home/Dashboard carousel.
export function getActivePromotions(audience) {
  const query = audience ? `?audience=${audience}` : '';
  return apiFetch(`/publications/active${query}`);
}

// Fully public (no auth needed, none sent even if a token happens to
// exist) - the one published policy document for /terms, /privacy, and
// /community-guidelines.
export function getPolicy(policyType) {
  return apiFetch(`/policies/${policyType}`);
}
