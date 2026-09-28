import { ApiError } from '../../middleware/error.middleware.js';
import { uploadBuffer } from '../../lib/cloudinary.js';
import { emitToUser } from '../../realtime/socket.js';
import { notify } from '../notifications/notifications.service.js';
import * as bookingsModel from '../bookings/bookings.model.js';
import * as platformSettingsService from '../platformSettings/platformSettings.service.js';
import * as quotesModel from './quotes.model.js';

async function requireBooking(bookingId) {
  const booking = await bookingsModel.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return booking;
}

// Who can submit a quote on a booking depends on whether it already has an
// assigned worker (see the 043 migration comment):
// - booking.workerId set -> manual counter-quote (Phase 2). Only that
//   worker may submit; this naturally produces at most one active row.
// - booking.workerId null -> Get Quotes (Phase 3). Any approved worker may
//   submit - which workers is an open request should actually be shown to
//   (matching by category/district/online status) is Phase 3 UI/matching
//   work, not enforced here.
function assertCanSubmitQuote(booking, workerId) {
  if (booking.workerId && booking.workerId !== workerId) {
    throw new ApiError(403, 'This booking is already assigned to a different worker');
  }
}

// Bounded by the admin price band (platform_settings.service_price_bands),
// same hard floor/ceiling workers.service.js's saveOnboardingWork already
// enforces for a worker's own listed price - decided as the safer default
// per the founder's instruction to flag this rather than guess, since a
// quote is functionally "a worker setting a price for a service" the same
// way onboarding pricing is. Summed across every service on the booking;
// if any service has no band defined yet, no bound is enforced (same
// leniency as the "no band -> not flagged" behavior elsewhere) rather than
// guessing at a partial bound.
async function assertWithinPriceBand(booking, amount) {
  const bands = await platformSettingsService.getServicePriceBands();
  let min = 0;
  let max = 0;
  for (const service of booking.services) {
    const band = bands[String(service.serviceId)];
    if (!band) return; // any unbanded service -> no bound enforced for this quote
    min += Number(band.min);
    max += Number(band.max);
  }
  if (amount < min || amount > max) {
    throw new ApiError(400, `Quote amount must be between Rs. ${min} and Rs. ${max}`);
  }
}

// Phase 2 (manual counter-quote): only makes sense while the booking is
// still awaiting a first decision - once it's accepted/declined/cancelled/
// etc. there's nothing left for a quote to counter. Get Quotes (Phase 3,
// not built here) will have its own open-window semantics on top of this,
// but "requested" is the correct gate for both: a quote is only ever a
// response to an outstanding request.
function assertBookingAwaitingDecision(booking) {
  if (booking.status !== 'requested') {
    throw new ApiError(400, 'This booking is no longer awaiting a decision');
  }
}

export async function submitQuote(bookingId, workerId, { amount, message }, file) {
  const booking = await requireBooking(bookingId);
  assertCanSubmitQuote(booking, workerId);
  assertBookingAwaitingDecision(booking);
  await assertWithinPriceBand(booking, amount);

  // At most one quote per worker per booking, EVER - not just "no second
  // pending one" (see quotesModel.findAnyByBookingAndWorker). A worker
  // whose quote was already declined can't come back with another.
  const existing = await quotesModel.findAnyByBookingAndWorker(bookingId, workerId);
  if (existing) {
    throw new ApiError(
      409,
      existing.status === 'submitted'
        ? 'You already have a pending quote on this booking - wait for a decision before resubmitting'
        : 'You have already submitted a quote on this booking'
    );
  }

  let photoUrl = null;
  if (file) {
    const result = await uploadBuffer(file.buffer, { folder: `sajilo-bazar/quotes/${bookingId}` });
    photoUrl = result.secure_url;
  }

  const quote = await quotesModel.create({ bookingId, workerId, amount, message, photoUrl });

  // The customer's dashboard/Booking Detail need to know a quote is now
  // awaiting them - reuses the same booking:status_changed event and
  // notify() pattern bookings.service.js already pushes on every status
  // transition, even though the booking's own status field hasn't moved
  // (hasPendingQuote is what changed - see bookingsModel's SELECT_BOOKING).
  const updatedBooking = await bookingsModel.findById(bookingId);
  await notify(booking.customerId, 'quote_received', {
    bookingId,
    workerName: updatedBooking.workerName,
    amount,
  });
  emitToUser(booking.customerId, 'booking:status_changed', { booking: updatedBooking });

  return quote;
}

// Visibility: the customer sees every quote on their own booking (they're
// choosing between them); a worker sees only their own - competitors'
// amounts/messages stay private, same reasoning booking_offers already
// hides other workers' instant-request offers from each other. Anyone
// else (a worker with no quote here, an unrelated customer) is rejected
// outright rather than silently handed an empty list - an empty array is
// a legitimate answer only for someone who's actually allowed to ask.
export async function listQuotes(bookingId, userId) {
  const booking = await requireBooking(bookingId);
  const all = await quotesModel.listByBooking(bookingId);
  if (userId === booking.customerId) return all;

  const own = all.filter((q) => q.workerId === userId);
  if (own.length > 0 || booking.workerId === userId) return own;
  throw new ApiError(403, 'Forbidden');
}

// The Phase 2 piece Phase 1 deliberately left undone: an accept doesn't
// just flip the quote's own status, it moves the booking itself forward -
// same "accepted" lifecycle state as if the worker had accepted at listed
// price, just at the worker's quoted amount instead (setAcceptedWithPrice).
// A decline closes the booking out ('declined', same status a plain
// worker-decline produces) - no counter-negotiation loop, matching the
// "declining just cancels that request" design in the spec. Either way the
// OTHER party (the worker, since the customer is the one deciding here) is
// the one who needs telling - same "notify whichever side didn't act"
// pattern bookings.service.js's cancelBooking already uses.
export async function decideQuote(quoteId, userId, decision) {
  const quote = await quotesModel.findRawById(quoteId);
  if (!quote) throw new ApiError(404, 'Quote not found');
  const booking = await requireBooking(quote.booking_id);
  if (booking.customerId !== userId) throw new ApiError(403, 'Forbidden');
  if (quote.status !== 'submitted') throw new ApiError(400, 'This quote has already been decided');
  assertBookingAwaitingDecision(booking);

  const updatedQuote = await quotesModel.updateStatus(quoteId, decision === 'accept' ? 'accepted' : 'declined');

  let updatedBooking;
  if (decision === 'accept') {
    updatedBooking = await bookingsModel.setAcceptedWithPrice(booking.id, Number(quote.amount));
    await notify(quote.worker_id, 'quote_accepted', { bookingId: booking.id, amount: Number(quote.amount) });
  } else {
    updatedBooking = await bookingsModel.setDeclined(
      booking.id,
      `Your counter-quote of Rs. ${quote.amount} was declined`
    );
    await notify(quote.worker_id, 'quote_declined', { bookingId: booking.id, amount: Number(quote.amount) });
  }
  emitToUser(quote.worker_id, 'booking:status_changed', { booking: updatedBooking });

  // The booking comes back too so the customer's own screen (the actor
  // here) can update immediately from the HTTP response, same pattern
  // BookingDetail.jsx's runAction already uses for accept/decline/etc.
  return { quote: updatedQuote, booking: updatedBooking };
}

// Proxy stream target (GET /quotes/:id/photo) - same never-expose-the-raw-
// URL rule as admin.service.js's getDocumentFile. Either party on the
// quote's booking (not just the customer) can view it.
export async function getQuotePhotoFile(quoteId, userId) {
  const quote = await quotesModel.findRawById(quoteId);
  if (!quote) throw new ApiError(404, 'Quote not found');
  const booking = await requireBooking(quote.booking_id);
  if (booking.customerId !== userId && booking.workerId !== userId && quote.worker_id !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
  if (!quote.photo_url) throw new ApiError(404, 'This quote has no photo');

  const upstream = await fetch(quote.photo_url);
  if (!upstream.ok) throw new ApiError(502, 'Could not retrieve this photo right now');
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return { buffer, contentType: upstream.headers.get('content-type') || 'application/octet-stream' };
}
