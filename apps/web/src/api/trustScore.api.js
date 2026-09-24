import { apiFetch } from './client.js';

export function getMyTrustScore() {
  return apiFetch('/trust-score/me');
}
