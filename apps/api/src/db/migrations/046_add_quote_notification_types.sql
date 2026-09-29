-- Manual counter-quote (Phase 2) adds quote_received/quote_accepted/
-- quote_declined to NOTIFICATION_TYPES (packages/shared/schemas/enums.js) -
-- this table's own CHECK constraint needs the same three values or notify()
-- fails at the DB layer the moment one is used (see notifications.service.js).
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_requested', 'booking_accepted', 'booking_declined',
    'booking_request_expired', 'booking_status_changed', 'chat_message',
    'review_received', 'verification_update', 'announcement',
    'dispute_resolved', 'support_reply',
    'quote_received', 'quote_accepted', 'quote_declined'
  ));
