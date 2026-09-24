import { apiFetch } from './client.js';

export function getMySummary() {
  return apiFetch('/commission-ledger/me/summary');
}

export function getMySparkline() {
  return apiFetch('/commission-ledger/me/sparkline');
}

export function getMySeries(range) {
  return apiFetch(`/commission-ledger/me/series?range=${range}`);
}

export function getMyHistory(page = 1) {
  return apiFetch(`/commission-ledger/me/history?page=${page}`);
}
