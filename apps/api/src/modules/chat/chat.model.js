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
