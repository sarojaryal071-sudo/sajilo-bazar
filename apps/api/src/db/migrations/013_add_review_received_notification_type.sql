-- Adds 'review_received' to notifications.type - a worker is notified when
-- a customer leaves a review on one of their completed bookings.

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_requested', 'booking_accepted', 'booking_declined',
    'booking_status_changed', 'chat_message', 'review_received',
    'verification_update'
  ));
