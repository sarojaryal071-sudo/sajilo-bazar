-- Photo/file attachments for booking chat. Reuses the existing Cloudinary
-- upload pipeline (same one verification documents/profile photos use) -
-- one row per message still, an attachment is just an alternate payload on
-- the same chat_messages row rather than a separate table, since a message
-- is either text or an attachment (optionally both, though the UI in this
-- round only ever sends one or the other).
--
-- message becomes nullable so an attachment-only message doesn't need a
-- placeholder string; the CHECK below guarantees every row still has some
-- content. Attachments persist on the row like any other message field -
-- disputes reusing the booking's chat transcript as evidence (business
-- plan §7) will retrieve them the same way as regular messages, not as a
-- one-time transient preview.
ALTER TABLE chat_messages ALTER COLUMN message DROP NOT NULL;
ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT;
ALTER TABLE chat_messages ADD COLUMN attachment_type VARCHAR(10) CHECK (attachment_type IN ('image', 'pdf'));
ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255);
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_has_content
  CHECK (message IS NOT NULL OR attachment_url IS NOT NULL);
