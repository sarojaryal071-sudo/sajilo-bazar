import { pool } from '../../db/pool.js';

// Public-facing shape (no photo_url - see QuoteSchema for why). Used by
// every read path except the proxy stream endpoint, which needs the raw
// row instead (see findRawById below).
function toQuote(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    workerId: row.worker_id,
    amount: Number(row.amount),
    message: row.message,
    hasPhoto: row.photo_url !== null,
    status: row.status,
    workerName: row.worker_name ?? null,
    workerImageUrl: row.worker_image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_QUOTE = `
  SELECT q.*, u.full_name AS worker_name, u.profile_image_url AS worker_image_url
  FROM quotes q
  JOIN users u ON u.id = q.worker_id
`;

export async function listByBooking(bookingId) {
  const { rows } = await pool.query(`${SELECT_QUOTE} WHERE q.booking_id = $1 ORDER BY q.created_at DESC`, [
    bookingId,
  ]);
  return rows.map(toQuote);
}

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_QUOTE} WHERE q.id = $1`, [id]);
  return rows[0] ? toQuote(rows[0]) : null;
}

// Raw row (photo_url included) for the proxy stream endpoint and for the
// service layer's own authorization checks (e.g. re-reading bookingId/
// workerId without a join). Never exposed as-is to a controller response.
export async function findRawById(id) {
  const { rows } = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
  return rows[0] ?? null;
}

// A worker's current pending (submitted) quote on a booking, if any - used
// to reject a second submission while one is still outstanding rather than
// silently accumulating duplicate rows (see quotes.service.js submitQuote).
export async function findSubmittedByBookingAndWorker(bookingId, workerId) {
  const { rows } = await pool.query(
    `SELECT * FROM quotes WHERE booking_id = $1 AND worker_id = $2 AND status = 'submitted'`,
    [bookingId, workerId]
  );
  return rows[0] ?? null;
}

export async function create({ bookingId, workerId, amount, message, photoUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO quotes (booking_id, worker_id, amount, message, photo_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [bookingId, workerId, amount, message ?? null, photoUrl ?? null]
  );
  return findById(rows[0].id);
}

export async function updateStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE quotes SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, status]
  );
  if (!rows[0]) return null;
  return findById(id);
}
