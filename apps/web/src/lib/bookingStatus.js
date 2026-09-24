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

// A terminal status with no worker ever assigned (workerId still null) means
// an unclaimed instant request that was cancelled, or a scheduled request
// that auto-expired unanswered (also reuses 'declined' - see bookings.model.js
// expireOverdueScheduledRequests) - "Finding a worker..." is only true while
// actively searching (status 'requested'), so it's wrong to keep showing that
// once the search is over.
export const NO_WORKER_TERMINAL_STATUSES = ['cancelled', 'declined'];
