import { apiFetch } from './client.js';

export function getMyLedger() {
  return apiFetch('/commission-ledger/me');
}
