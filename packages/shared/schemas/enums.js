// Shared enums used across the User, Worker, Booking, etc. schemas.
// Single source of truth so frontend and backend never disagree on
// valid values for a status/role field.

export const USER_ROLES = ['customer', 'worker', 'admin'];

export const MODERATION_STATUSES = ['active', 'suspended'];

export const VERIFICATION_STATUSES = ['unsubmitted', 'pending', 'approved', 'rejected'];

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
  'verification_update',
];
