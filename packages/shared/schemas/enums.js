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

export const NOTIFICATION_TYPES = [
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_status_changed',
  'chat_message',
  'review_received',
  'verification_update',
];
