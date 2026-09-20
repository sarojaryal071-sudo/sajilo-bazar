import { pool } from '../../db/pool.js';

function toReview(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function findByBookingId(bookingId) {
  const { rows } = await pool.query('SELECT * FROM reviews WHERE booking_id = $1', [bookingId]);
  return rows[0] ? toReview(rows[0]) : null;
}

async function create(client, { bookingId, rating, comment }) {
  const { rows } = await client.query(
    `INSERT INTO reviews (booking_id, rating, comment) VALUES ($1, $2, $3) RETURNING *`,
    [bookingId, rating, comment ?? null]
  );
  return toReview(rows[0]);
}

async function recalcWorkerRating(client, workerId) {
  await client.query(
    `UPDATE worker_profiles SET rating_avg = COALESCE((
       SELECT AVG(r.rating) FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       WHERE b.worker_id = $1
     ), 0) WHERE user_id = $1`,
    [workerId]
  );
}

// A review also updates the worker's aggregate rating, so both writes
// happen in one transaction.
export async function createAndRecalc({ bookingId, workerId, rating, comment }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const review = await create(client, { bookingId, rating, comment });
    await recalcWorkerRating(client, workerId);
    await client.query('COMMIT');
    return review;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
