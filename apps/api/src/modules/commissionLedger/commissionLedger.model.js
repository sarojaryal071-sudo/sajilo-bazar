import { pool } from '../../db/pool.js';

function toEntry(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    bookingId: row.booking_id,
    jobPrice: Number(row.job_price),
    commissionAmount: Number(row.commission_amount),
    creditBalanceAfter: Number(row.credit_balance_after),
    createdAt: row.created_at,
  };
}

// The worker's running balance is just their most recent entry's
// credit_balance_after - no separate balance column to keep in sync.
// No entries yet means a fresh worker with nothing owed.
export async function findLatestBalance(workerId) {
  const { rows } = await pool.query(
    'SELECT credit_balance_after FROM commission_ledger WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 1',
    [workerId]
  );
  return rows[0] ? Number(rows[0].credit_balance_after) : 0;
}

export async function create({ workerId, bookingId, jobPrice, commissionAmount, creditBalanceAfter }) {
  const { rows } = await pool.query(
    `INSERT INTO commission_ledger (worker_id, booking_id, job_price, commission_amount, credit_balance_after)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [workerId, bookingId, jobPrice, commissionAmount, creditBalanceAfter]
  );
  return toEntry(rows[0]);
}

export async function listForWorker(workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM commission_ledger WHERE worker_id = $1 ORDER BY created_at DESC',
    [workerId]
  );
  return rows.map(toEntry);
}
