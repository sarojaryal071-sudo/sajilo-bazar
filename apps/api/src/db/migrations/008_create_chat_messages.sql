-- In-app chat tied to a single booking - no standalone conversations/threads
-- table, since a booking's chat only ever exists in the context of that
-- booking (see PROJECT_BRIEF.md Phase 2 scope).

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_booking ON chat_messages(booking_id, created_at);
