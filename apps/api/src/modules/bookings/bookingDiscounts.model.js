import { pool } from '../../db/pool.js';

// Phase 3a: durable log of every discount a worker applies at completion -
// no admin screen reads this yet (not built this phase), but the data is
// captured and queryable directly against the table in the meantime. Never
// exposed through a controller response - this is an audit log, not
// something surfaced back to the app right now.
export async function create({ bookingId, workerId, originalPrice, discountedPrice, reason }) {
  const { rows } = await pool.query(
    `INSERT INTO booking_discounts (booking_id, worker_id, original_price, discounted_price, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [bookingId, workerId, originalPrice, discountedPrice, reason]
  );
  return rows[0].id;
}
