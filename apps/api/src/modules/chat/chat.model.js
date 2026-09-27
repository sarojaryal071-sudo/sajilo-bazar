import { pool } from '../../db/pool.js';

function toMessage(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    senderId: row.sender_id,
    message: row.message,
    attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type,
    attachmentName: row.attachment_name,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listByBooking(bookingId) {
  const { rows } = await pool.query(
    'SELECT * FROM chat_messages WHERE booking_id = $1 ORDER BY created_at ASC',
    [bookingId]
  );
  return rows.map(toMessage);
}

export async function create({
  bookingId,
  senderId,
  message = null,
  attachmentUrl = null,
  attachmentType = null,
  attachmentName = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (booking_id, sender_id, message, attachment_url, attachment_type, attachment_name)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [bookingId, senderId, message, attachmentUrl, attachmentType, attachmentName]
  );
  return toMessage(rows[0]);
}

// Single-message delivery - the "recipient's socket is already in the
// room at send time" path (see chat.service.js maybeMarkDelivered).
export async function markMessageDelivered(id) {
  const { rows } = await pool.query(
    'UPDATE chat_messages SET delivered_at = now() WHERE id = $1 AND delivered_at IS NULL RETURNING *',
    [id]
  );
  return rows[0] ? toMessage(rows[0]) : null;
}

// Bulk catch-up - every message from the OTHER party not yet marked
// delivered, the moment this user (re)joins the booking's chat room.
export async function markUndeliveredAsDelivered(bookingId, recipientId) {
  const { rows } = await pool.query(
    `UPDATE chat_messages SET delivered_at = now()
     WHERE booking_id = $1 AND sender_id != $2 AND delivered_at IS NULL
     RETURNING id`,
    [bookingId, recipientId]
  );
  return rows.map((r) => r.id);
}

// Read implies delivered (WhatsApp/Messenger semantics) - backfills
// delivered_at too, in case a message is marked read without ever having
// passed through the delivered step first.
export async function markUnreadAsRead(bookingId, readerId) {
  const { rows } = await pool.query(
    `UPDATE chat_messages SET read_at = now(), delivered_at = COALESCE(delivered_at, now())
     WHERE booking_id = $1 AND sender_id != $2 AND read_at IS NULL
     RETURNING id`,
    [bookingId, readerId]
  );
  return rows.map((r) => r.id);
}
