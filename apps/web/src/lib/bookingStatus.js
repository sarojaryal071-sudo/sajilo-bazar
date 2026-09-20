// Single source of truth for how a booking status renders across the
// Bookings list, Jobs list, and Booking detail screens.

export const BOOKING_STATUS_LABEL = {
  requested: 'Requested',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export const BOOKING_STATUS_TONE = {
  requested: 'warning',
  accepted: 'success',
  in_progress: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  declined: 'danger',
};
