// Shared enums used across the User, Worker, Booking, etc. schemas.
// Single source of truth so frontend and backend never disagree on
// valid values for a status/role field.

export const USER_ROLES = ['customer', 'worker', 'admin'];

export const MODERATION_STATUSES = ['active', 'suspended'];

export const VERIFICATION_STATUSES = ['unsubmitted', 'pending', 'approved', 'rejected'];

// A document's own review status is never "unsubmitted" - the row only exists once
// it's uploaded. Separate from VERIFICATION_STATUSES above (that one also covers the
// worker profile's aggregate state before any document exists).
export const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'];

// Same shape as DOCUMENT_STATUSES but a distinct concept: whether a specific
// worker_services row is bookable yet. Same-category additions to an already
// approved worker start 'approved'; a different category starts 'pending'
// until admin review (Phase 6).
export const SERVICE_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

export const BOOKING_TYPES = ['manual', 'instant'];

export const BOOKING_STATUSES = [
  'requested',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
];

export const BOOKING_OFFER_STATUSES = ['pending', 'accepted', 'expired', 'declined'];

// Preset choices only for a scheduled booking's response deadline - not
// freeform (business plan §13).
export const RESPONSE_DEADLINE_HOURS = [1, 6, 24];

// 'esewa' exists here so bookings.paymentMethod can represent it once
// chosen, but CompleteBookingInputSchema only accepts 'cash' for now - it's
// a visual placeholder (disabled, "Coming soon") until the gateway is
// actually built (business plan §6).
export const PAYMENT_METHODS = ['cash', 'esewa'];

// Customer-facing trust tier only - the raw 0-100 score, its per-factor
// breakdown, and any dispute count are worker-eyes-only (see trustScore
// module). 'building_trust' also covers a worker still in the grace period.
export const TRUST_TIERS = ['building_trust', 'trusted', 'highly_trusted'];

export const NOTIFICATION_TYPES = [
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_request_expired',
  'booking_status_changed',
  'chat_message',
  'review_received',
  'verification_update',
  'announcement',
];

// Settings -> Notifications matrix rows. Coarser than NOTIFICATION_TYPES -
// the matrix groups related types under one togglable row rather than
// exposing all nine individually.
export const NOTIFICATION_CATEGORIES = ['bookings', 'chat', 'support', 'reviews', 'promos'];

// Which matrix row gates a given notification type - read by notify()
// (apps/api/src/modules/notifications/notifications.service.js) to decide
// whether a user's Settings -> Notifications -> In-app preference allows
// this notification through. verification_update sits under 'support'
// (a decision from admin about the worker's own account, the closest fit
// among the five fixed rows) rather than getting a sixth row of its own.
export const NOTIFICATION_TYPE_CATEGORY = {
  booking_requested: 'bookings',
  booking_accepted: 'bookings',
  booking_declined: 'bookings',
  booking_request_expired: 'bookings',
  booking_status_changed: 'bookings',
  chat_message: 'chat',
  review_received: 'reviews',
  verification_update: 'support',
  announcement: 'promos',
};
