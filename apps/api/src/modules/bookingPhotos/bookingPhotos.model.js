import { pool } from '../../db/pool.js';

// Public-facing shape (no url - see BookingPhotoSchema). Used by every read
// path except the proxy stream endpoint, which needs the raw row instead.
function toBookingPhoto(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    uploadedBy: row.uploaded_by,
    photoType: row.photo_type,
    createdAt: row.created_at,
  };
}

export async function listByBooking(bookingId) {
  const { rows } = await pool.query(
    'SELECT * FROM booking_photos WHERE booking_id = $1 ORDER BY created_at ASC',
    [bookingId]
  );
  return rows.map(toBookingPhoto);
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM booking_photos WHERE id = $1', [id]);
  return rows[0] ? toBookingPhoto(rows[0]) : null;
}

// Raw row (url included) for the proxy stream endpoint. Never exposed
// as-is to a controller response.
export async function findRawById(id) {
  const { rows } = await pool.query('SELECT * FROM booking_photos WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function create({ bookingId, uploadedBy, photoType, url }) {
  const { rows } = await pool.query(
    `INSERT INTO booking_photos (booking_id, uploaded_by, photo_type, url)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [bookingId, uploadedBy, photoType, url]
  );
  return findById(rows[0].id);
}
