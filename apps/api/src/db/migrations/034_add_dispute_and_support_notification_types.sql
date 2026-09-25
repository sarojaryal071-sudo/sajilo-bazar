-- Bug-fix round 2026-09-25, issue 1: the unified Alerts feed is missing
-- dispute resolutions and admin support-ticket replies - both already had
-- backend actions (admin.service.js resolveDispute/replyToTicket) but
-- neither ever called notify(), so neither party found out except by
-- checking back manually. Adds the two missing notification types.

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_requested', 'booking_accepted', 'booking_declined',
    'booking_request_expired', 'booking_status_changed', 'chat_message',
    'review_received', 'verification_update', 'announcement',
    'dispute_resolved', 'support_reply'
  ));
