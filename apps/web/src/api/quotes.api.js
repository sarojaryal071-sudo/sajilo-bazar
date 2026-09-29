import { apiFetch } from './client.js';

// Manual counter-quote (Phase 2). Photo upload isn't part of this phase's
// UI (spec: "amount + optional message") even though the backend already
// accepts one - so no isFormData path here, unlike bookings.api.js's
// sendAttachment.
export function submitQuote(bookingId, { amount, message }) {
  return apiFetch(`/bookings/${bookingId}/quotes`, { method: 'POST', body: { amount, message: message || null } });
}

export function listQuotes(bookingId) {
  return apiFetch(`/bookings/${bookingId}/quotes`);
}

export function decideQuote(quoteId, decision) {
  return apiFetch(`/quotes/${quoteId}`, { method: 'PATCH', body: { decision } });
}
