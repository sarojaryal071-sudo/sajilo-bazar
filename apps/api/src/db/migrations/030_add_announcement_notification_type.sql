-- Adds 'announcement' to notifications.type - publishing an announcement
-- (admin.service.js setAnnouncementStatus) now fans a real notification
-- out to every matching customer/worker, so it lands in their Alerts
-- inbox and not just the easy-to-miss/dismiss Home/Dashboard promo banner.

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_requested', 'booking_accepted', 'booking_declined',
    'booking_request_expired', 'booking_status_changed', 'chat_message',
    'review_received', 'verification_update', 'announcement'
  ));
