import { apiFetch } from './client.js';

// Phase 3a: the customer's optional "problem" photo at booking-request
// time - reuses Phase 1's booking_photos upload endpoint (schema/API only
// until now, no UI). Once a worker is confirmed, the backend auto-posts
// this same photo into that worker's chat (see chat.service.js
// postProblemPhotoIfAny) - nothing else reads it through this client.
export function upload(bookingId, file, photoType) {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('photoType', photoType);
  return apiFetch(`/bookings/${bookingId}/photos`, { method: 'POST', body: formData, isFormData: true });
}
