import { pool } from '../../db/pool.js';

function toMessage(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    senderId: row.sender_id,
    message: row.message,
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

export async function create({ bookingId, senderId, message }) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (booking_id, sender_id, message) VALUES ($1, $2, $3) RETURNING *`,
    [bookingId, senderId, message]
  );
  return toMessage(rows[0]);
}
