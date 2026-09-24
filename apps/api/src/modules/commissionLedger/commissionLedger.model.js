import { pool } from '../../db/pool.js';

function toEntry(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    bookingId: row.booking_id,
    customerName: row.customer_name ?? null,
    serviceNames: row.service_names ?? '',
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

// One booking has at most one ledger entry (see the table's UNIQUE
// (booking_id) constraint) - used by the admin Bookings detail screen.
export async function findByBookingId(bookingId) {
  const { rows } = await pool.query('SELECT * FROM commission_ledger WHERE booking_id = $1', [bookingId]);
  return rows[0] ? toEntry(rows[0]) : null;
}

// Page of transaction history for the full Earnings screen, newest first.
// Each entry's service names are pulled from booking_services/services via
// a correlated subquery rather than a join, so a multi-service booking
// still collapses to exactly one ledger row (a join would fan out one row
// per service). customer_name comes from the booking's customer - a plain
// join is safe here since commission_ledger.booking_id is unique.
export async function listForWorkerPage(workerId, { limit, offset }) {
  const [{ rows }, {
    rows: [{ count }],
  }] = await Promise.all([
    pool.query(
      `SELECT cl.*, u.full_name AS customer_name,
              (SELECT string_agg(s.name, ', ' ORDER BY s.name)
               FROM booking_services bs
               JOIN services s ON s.id = bs.service_id
               WHERE bs.booking_id = cl.booking_id) AS service_names
       FROM commission_ledger cl
       JOIN bookings b ON b.id = cl.booking_id
       JOIN users u ON u.id = b.customer_id
       WHERE cl.worker_id = $1
       ORDER BY cl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workerId, limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM commission_ledger WHERE worker_id = $1', [workerId]),
  ]);
  return { entries: rows.map(toEntry), total: Number(count) };
}

// Lifetime/this-month/this-week aggregates in one query, plus the running
// balance (see findLatestBalance) - avoids loading every entry into JS just
// to sum it.
export async function findTotals(workerId) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(job_price), 0) AS total_earned,
       COALESCE(SUM(commission_amount), 0) AS total_commission,
       COALESCE(SUM(job_price) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS this_month_earned,
       COALESCE(SUM(job_price) FILTER (WHERE created_at >= date_trunc('week', now())), 0) AS this_week_earned,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now())) AS this_week_jobs_completed
     FROM commission_ledger
     WHERE worker_id = $1`,
    [workerId]
  );
  const row = rows[0];
  return {
    totalEarned: Number(row.total_earned),
    totalCommission: Number(row.total_commission),
    thisMonthEarned: Number(row.this_month_earned),
    thisWeekEarned: Number(row.this_week_earned),
    thisWeekJobsCompleted: Number(row.this_week_jobs_completed),
  };
}

// Daily earnings for the last `days` calendar days (today inclusive), with
// zero-filled gaps via generate_series so the chart's x-axis is continuous
// even on days with no completed jobs.
export async function findDailySeries(workerId, days) {
  const { rows } = await pool.query(
    `SELECT d::date AS period, COALESCE(SUM(cl.job_price), 0) AS amount
     FROM generate_series(current_date - ($2::int - 1), current_date, interval '1 day') AS d
     LEFT JOIN commission_ledger cl ON cl.worker_id = $1 AND cl.created_at::date = d::date
     GROUP BY d
     ORDER BY d`,
    [workerId, days]
  );
  return rows.map((r) => ({ period: r.period, amount: Number(r.amount) }));
}

// Monthly earnings across the worker's entire history, for the "all time"
// chart range - zero-filled the same way as findDailySeries. A worker with
// no entries yet gets an empty series (MIN(created_at) is null, so the
// generate_series bounds collapse to nothing).
export async function findMonthlySeries(workerId) {
  const { rows } = await pool.query(
    `SELECT d::date AS period, COALESCE(SUM(cl.job_price), 0) AS amount
     FROM generate_series(
       (SELECT date_trunc('month', MIN(created_at)) FROM commission_ledger WHERE worker_id = $1),
       date_trunc('month', now()),
       interval '1 month'
     ) AS d
     LEFT JOIN commission_ledger cl
       ON cl.worker_id = $1 AND date_trunc('month', cl.created_at) = date_trunc('month', d)
     GROUP BY d
     ORDER BY d`,
    [workerId]
  );
  return rows.map((r) => ({ period: r.period, amount: Number(r.amount) }));
}
