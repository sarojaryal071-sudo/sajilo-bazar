-- One row per event a user should be told about - the durable record a
-- notification inbox reads from. The socket push (see realtime/socket.js)
-- is just a live nudge on top of this; if the user isn't connected, the row
-- is still here next time they open the app.

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL
    CHECK (type IN (
      'booking_requested', 'booking_accepted', 'booking_declined',
      'booking_status_changed', 'chat_message', 'verification_update'
    )),
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
