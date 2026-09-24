import { apiFetch } from './client.js';

// scheduledFor/responseDeadlineHours are omitted (not just null) for an
// urgent "now" booking - the shared schema requires both-or-neither.
export function create({
  workerId,
  serviceIds,
  addressLabel,
  latitude,
  longitude,
  scheduledFor,
  responseDeadlineHours,
}) {
  const body = { workerId, serviceIds, addressLabel, latitude, longitude };
  if (scheduledFor) {
    body.scheduledFor = scheduledFor;
    body.responseDeadlineHours = responseDeadlineHours;
  }
  return apiFetch('/bookings', { method: 'POST', body });
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

export function complete(id, { finalPrice, paymentMethod = 'cash' }) {
  return apiFetch(`/bookings/${id}/complete`, { method: 'PATCH', body: { finalPrice, paymentMethod } });
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

export function sendAttachment(bookingId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/bookings/${bookingId}/messages/attachment`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

export function getReview(bookingId) {
  return apiFetch(`/bookings/${bookingId}/review`);
}

export function createReview(bookingId, { rating, comment }) {
  return apiFetch(`/bookings/${bookingId}/review`, { method: 'POST', body: { rating, comment } });
}
