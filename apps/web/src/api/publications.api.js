import { apiFetch } from './client.js';

// Live type='promotion' publications for the Home/Dashboard carousel.
export function getActivePromotions(audience) {
  const query = audience ? `?audience=${audience}` : '';
  return apiFetch(`/publications/active${query}`);
}
