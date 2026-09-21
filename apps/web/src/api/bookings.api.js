import { apiFetch } from './client.js';

export function create({ workerId, serviceIds, addressLabel, latitude, longitude }) {
  return apiFetch('/bookings', {
    method: 'POST',
    body: { workerId, serviceIds, addressLabel, latitude, longitude },
  });
}

export function createInstant({ serviceIds, addressLabel, latitude, longitude }) {
  return apiFetch('/bookings/instant', {
    method: 'POST',
    body: { serviceIds, addressLabel, latitude, longitude },
  });
}

export function claim(id) {
  return apiFetch(`/bookings/${id}/claim`, { method: 'PATCH' });
}

export function declineOffer(id) {
  return apiFetch(`/bookings/${id}/decline-offer`, { method: 'PATCH' });
}

export function list({ status } = {}) {
  const query = status ? `?status=${status}` : '';
  return apiFetch(`/bookings${query}`);
}

export function getDetail(id) {
  return apiFetch(`/bookings/${id}`);
}

export function accept(id) {
  return apiFetch(`/bookings/${id}/accept`, { method: 'PATCH' });
}

export function decline(id) {
  return apiFetch(`/bookings/${id}/decline`, { method: 'PATCH' });
}

export function start(id) {
  return apiFetch(`/bookings/${id}/start`, { method: 'PATCH' });
}

export function complete(id) {
  return apiFetch(`/bookings/${id}/complete`, { method: 'PATCH' });
}

export function cancel(id, reason) {
  return apiFetch(`/bookings/${id}/cancel`, { method: 'PATCH', body: { reason } });
}

export function createDispute(id, reason) {
  return apiFetch(`/bookings/${id}/dispute`, { method: 'POST', body: { reason } });
}

export function listMessages(bookingId) {
  return apiFetch(`/bookings/${bookingId}/messages`);
}

export function sendMessage(bookingId, message) {
  return apiFetch(`/bookings/${bookingId}/messages`, { method: 'POST', body: { message } });
}

export function getReview(bookingId) {
  return apiFetch(`/bookings/${bookingId}/review`);
}

export function createReview(bookingId, { rating, comment }) {
  return apiFetch(`/bookings/${bookingId}/review`, { method: 'POST', body: { rating, comment } });
}
