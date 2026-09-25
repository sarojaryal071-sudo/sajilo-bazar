import { apiFetch } from './client.js';

export function list() {
  return apiFetch('/addresses/me');
}

export function create({ label, addressLabel, latitude, longitude, isDefault }) {
  return apiFetch('/addresses/me', { method: 'POST', body: { label, addressLabel, latitude, longitude, isDefault } });
}

export function update(id, { label, addressLabel, latitude, longitude }) {
  return apiFetch(`/addresses/me/${id}`, { method: 'PATCH', body: { label, addressLabel, latitude, longitude } });
}

export function remove(id) {
  return apiFetch(`/addresses/me/${id}`, { method: 'DELETE' });
}

export function setDefault(id) {
  return apiFetch(`/addresses/me/${id}/default`, { method: 'POST' });
}
