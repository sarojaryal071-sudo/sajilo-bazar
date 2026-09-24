import { apiFetch } from './client.js';

export function getActive(audience) {
  const query = audience ? `?audience=${audience}` : '';
  return apiFetch(`/announcements/active${query}`);
}
