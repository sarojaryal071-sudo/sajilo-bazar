-- Adds 'booking_request_expired' to notifications.type - a customer is
-- notified when their scheduled booking request auto-expires because the
-- worker didn't respond within the response deadline (business plan §13,
-- see bookings.service.js sweepExpiredScheduledRequests).

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_requested', 'booking_accepted', 'booking_declined',
    'booking_request_expired', 'booking_status_changed', 'chat_message',
    'review_received', 'verification_update'
  ));
