// Founder decision 2026-09-26: worker-facing operational actions (going
// online, accepting/declining a job or instant request, the active
// in-progress job screen, chat during a job, marking a job complete) are
// mobile-only - actively intercepted on a desktop-width viewport (see
// useIsDesktop.js) with this message, rather than silently failing or just
// omitting a desktop layout. Earnings/Profile/Settings/Availability/booking
// history are unaffected - only these operational actions are blocked.
export const WORKER_DESKTOP_BLOCK_MESSAGE = 'Go online and accept jobs from your mobile device.';

// A booking is "operationally active" for a worker while it's requested
// (accept/decline pending), accepted (start job pending), or in_progress
// (chat + mark-complete pending) - these three statuses are exactly the
// ones BookingDetail.jsx and BookingChat.jsx block entirely for a worker on
// desktop. Once a booking reaches a terminal status (completed/cancelled/
// declined) it's just history, which stays fully desktop-usable.
export const WORKER_ACTIVE_BOOKING_STATUSES = ['requested', 'accepted', 'in_progress'];
