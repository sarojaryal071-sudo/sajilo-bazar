import { pool } from '../../db/pool.js';

// Cheap, direct counts - no charts/trends here, that's Analytics later.
export async function getDashboardStats() {
  const [users, workers, pendingWorkers, bookings, commission] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM users'),
    pool.query('SELECT COUNT(*)::int AS count FROM worker_profiles'),
    pool.query("SELECT COUNT(*)::int AS count FROM worker_profiles WHERE verification_status = 'pending'"),
    pool.query('SELECT COUNT(*)::int AS count FROM bookings'),
    pool.query('SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_ledger'),
  ]);
  return {
    totalUsers: users.rows[0].count,
    totalWorkers: workers.rows[0].count,
    pendingVerificationCount: pendingWorkers.rows[0].count,
    totalBookings: bookings.rows[0].count,
    totalCommission: Number(commission.rows[0].total),
  };
}

// Analytics (Super-Admin-only tab on the universal Dashboard page) -
// genuinely deeper than the Dashboard's summary tiles, not a duplicate of
// them: a breakdown by booking status/user role plus month-over-month
// commission, rather than just totals.
export async function getAnalytics() {
  const [byStatus, byRole, thisMonth, lastMonth] = await Promise.all([
    pool.query('SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status'),
    pool.query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role'),
    pool.query(
      "SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_ledger WHERE created_at >= date_trunc('month', now())"
    ),
    pool.query(
      "SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_ledger WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())"
    ),
  ]);
  return {
    bookingsByStatus: byStatus.rows.map((r) => ({ status: r.status, count: r.count })),
    usersByRole: byRole.rows.map((r) => ({ role: r.role, count: r.count })),
    commissionThisMonth: Number(thisMonth.rows[0].total),
    commissionLastMonth: Number(lastMonth.rows[0].total),
  };
}

// ---- Dashboard insights (target-spec Phase 1, 2026-09-30) ----
// Ranked lists + flagged/top-performer sections + payment breakdown, all
// added to the same universal Dashboard page as getDashboardStats above -
// no department gate, same "everyone with any admin role" access. Modeled
// loosely on the old sajilo-app/sajilo-backend workerIntelligence idea
// (see docs/admin-panel-target-spec.md) but simplified to what this
// schema actually has, not a lift-and-shift of that service.

// ---- Dashboard rework (target-spec Phase 7, 2026-09-30) ----
// The five ranked name-lists above (top earners/rated/performers, recent
// low ratings, flagged workers) turned the Dashboard into a roster, not a
// summary - replaced by ratio/aggregate queries below. Each one's WHERE
// clause, thresholds and shared CTEs are carried over unchanged from the
// list version it replaces (FLAGGED_CTE_SQL below is verbatim the same
// three signals/thresholds getFlaggedWorkers used), just aggregated
// instead of returned row-by-row - and reused again by listUsers()'s new
// flagged/tier filters below so a dashboard card and the Users screen it
// links to always agree on who counts.

const FLAG_CANCELLATION_RATE_THRESHOLD = 0.2;
const FLAG_MIN_TERMINAL_JOBS = 5;
const FLAG_LOW_RATING_THRESHOLD = 3.0;
const FLAG_MIN_RATED_JOBS = 3;
const FLAG_INACTIVITY_DAYS = 30;

// Two CTE definitions (no leading WITH, no trailing SELECT) - every caller
// prepends its own `WITH ${FLAGGED_CTES_SQL}` and then selects off `flags`,
// whose three boolean reason columns a worker can be true on more than one
// of. Kept as CTE text rather than a one-shot query so the exact same SQL
// backs both the dashboard's aggregate (getFlaggedRate) and Users &
// Verification's flagged filter (listUsers) - one definition, not two
// copies of the thresholds that could drift apart.
const FLAGGED_CTES_SQL = `
  terminal AS (
    SELECT worker_id,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
           COUNT(*) FILTER (WHERE status = 'cancelled' AND initiated_by = 'worker') AS worker_cancelled_count,
           MAX(completed_at) AS last_completed_at
    FROM bookings
    WHERE worker_id IS NOT NULL AND (status = 'completed' OR (status = 'cancelled' AND initiated_by = 'worker'))
    GROUP BY worker_id
  ),
  flags AS (
    SELECT wp.user_id AS worker_id,
           (
             (COALESCE(t.completed_count, 0) + COALESCE(t.worker_cancelled_count, 0)) >= ${FLAG_MIN_TERMINAL_JOBS}
             AND COALESCE(t.worker_cancelled_count, 0)::numeric
                 / NULLIF(COALESCE(t.completed_count, 0) + COALESCE(t.worker_cancelled_count, 0), 0)
                 >= ${FLAG_CANCELLATION_RATE_THRESHOLD}
           ) AS high_cancellation_rate,
           (wp.jobs_completed_count >= ${FLAG_MIN_RATED_JOBS} AND wp.rating_avg < ${FLAG_LOW_RATING_THRESHOLD}) AS low_rating,
           (
             wp.approved_at IS NOT NULL
             AND EXTRACT(EPOCH FROM (now() - wp.approved_at)) / 86400 >= ${FLAG_INACTIVITY_DAYS}
             AND (wp.jobs_completed_count = 0 OR EXTRACT(EPOCH FROM (now() - t.last_completed_at)) / 86400 >= ${FLAG_INACTIVITY_DAYS})
           ) AS inactive
    FROM worker_profiles wp
    LEFT JOIN terminal t ON t.worker_id = wp.user_id
    WHERE wp.verification_status = 'approved'
  )
`;

// Top Performers' old ranking criteria (trust_score, gated to a few
// completed jobs so one lucky 5-star booking can't outrank a proven
// worker) reused as the "top performer" bucket's boundary, combined with
// trustScore.service.js's own already-shipped tier cutoffs (80/50 - see
// its tierFor()) for the other two bands, since Phase 1 itself never
// defined where "top" ends and "standard" begins, only "top 10 by rank".
const TOP_PERFORMER_MIN_JOBS = 3;
const TIER_CASE_SQL = `
  CASE
    WHEN wp.trust_score IS NOT NULL AND wp.trust_score >= 80 AND wp.jobs_completed_count >= ${TOP_PERFORMER_MIN_JOBS}
      THEN 'top_performer'
    WHEN wp.trust_score IS NOT NULL AND wp.trust_score >= 50
      THEN 'standard'
    ELSE 'below_threshold'
  END
`;

// Rating distribution - % of active workers at 5/4/3/below-3 stars.
// Restricted to workers with at least one completed job: a brand-new
// approved worker has rating_avg = 0 (the column's NOT NULL default, not
// "zero stars"), and counting them would flood "below 3 stars" with
// workers who simply have no rating yet.
export async function getRatingDistribution() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE rating_avg >= 4.5)::int AS five_star,
       COUNT(*) FILTER (WHERE rating_avg >= 3.5 AND rating_avg < 4.5)::int AS four_star,
       COUNT(*) FILTER (WHERE rating_avg >= 2.5 AND rating_avg < 3.5)::int AS three_star,
       COUNT(*) FILTER (WHERE rating_avg < 2.5)::int AS below_three_star,
       COUNT(*)::int AS total
     FROM worker_profiles
     WHERE verification_status = 'approved' AND jobs_completed_count > 0`
  );
  const r = rows[0];
  return {
    total: r.total,
    buckets: [
      { key: 'five_star', label: '5 stars', count: r.five_star },
      { key: 'four_star', label: '4 stars', count: r.four_star },
      { key: 'three_star', label: '3 stars', count: r.three_star },
      { key: 'below_three_star', label: 'Below 3 stars', count: r.below_three_star },
    ],
  };
}

// Flagged rate - % of active workers currently carrying >=1 flag reason,
// broken into the three reasons (a worker can count in more than one).
export async function getFlaggedRate() {
  const { rows } = await pool.query(
    `WITH ${FLAGGED_CTES_SQL}
     SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE high_cancellation_rate OR low_rating OR inactive)::int AS flagged_count,
            COUNT(*) FILTER (WHERE high_cancellation_rate)::int AS high_cancellation_rate_count,
            COUNT(*) FILTER (WHERE low_rating)::int AS low_rating_count,
            COUNT(*) FILTER (WHERE inactive)::int AS inactive_count
     FROM flags`
  );
  const r = rows[0];
  return {
    total: r.total,
    flaggedCount: r.flagged_count,
    byReason: [
      { key: 'low_rating', label: 'Low rating', count: r.low_rating_count },
      { key: 'inactive', label: 'Inactive', count: r.inactive_count },
      { key: 'high_cancellation_rate', label: 'High cancellation rate', count: r.high_cancellation_rate_count },
    ],
  };
}

// Performance tier split - % top performer / standard / below threshold,
// via TIER_CASE_SQL above.
export async function getPerformanceTierSplit() {
  const { rows } = await pool.query(
    `SELECT ${TIER_CASE_SQL} AS tier, COUNT(*)::int AS count
     FROM worker_profiles wp
     WHERE wp.verification_status = 'approved'
     GROUP BY tier`
  );
  const byTier = { top_performer: 0, standard: 0, below_threshold: 0 };
  for (const r of rows) byTier[r.tier] = r.count;
  const total = byTier.top_performer + byTier.standard + byTier.below_threshold;
  return {
    total,
    tiers: [
      { key: 'top_performer', label: 'Top performer', count: byTier.top_performer },
      { key: 'standard', label: 'Standard', count: byTier.standard },
      { key: 'below_threshold', label: 'Below threshold', count: byTier.below_threshold },
    ],
  };
}

// Earnings concentration - what share of total gross worker earnings
// (commission_ledger.job_price, same "earning" definition the old Top
// Earning Workers list used) the top 10% of earning workers account for.
// NTILE(10) over workers ordered by earnings DESC splits them into decile
// buckets; decile 1 is the top tenth (NTILE spreads any remainder across
// the earliest buckets, so this stays a reasonable "top ~10%" even when
// the worker count isn't a multiple of 10).
export async function getEarningsConcentration() {
  const { rows } = await pool.query(
    `WITH earnings AS (
       SELECT worker_id, SUM(job_price)::numeric AS total
       FROM commission_ledger GROUP BY worker_id
     ),
     ranked AS (
       SELECT total, NTILE(10) OVER (ORDER BY total DESC) AS decile
       FROM earnings
     )
     SELECT COALESCE(SUM(total) FILTER (WHERE decile = 1), 0)::numeric AS top_decile_total,
            COALESCE(SUM(total), 0)::numeric AS grand_total,
            COUNT(*)::int AS worker_count
     FROM ranked`
  );
  const r = rows[0];
  const grandTotal = Number(r.grand_total);
  const topDecileTotal = Number(r.top_decile_total);
  return {
    workerCount: r.worker_count,
    grandTotal,
    topDecileTotal,
    topDecileShare: grandTotal > 0 ? topDecileTotal / grandTotal : 0,
  };
}

// Cancellation trend, last 30 days, split by initiator. Bucketed by
// cancelled_at (migration 053) - the day the cancellation actually
// happened, not the day the booking was originally made. A cancellation
// from before migration 053 shipped has cancelled_at = NULL (no reliable
// way to know when it happened - see the migration), so it's simply
// excluded here rather than falling back to created_at, which would
// silently reintroduce the same inaccuracy this query used to have.
export async function getCancellationTrend() {
  const { rows } = await pool.query(
    `SELECT day::date AS day,
            COUNT(*) FILTER (WHERE b.initiated_by = 'customer')::int AS customer_count,
            COUNT(*) FILTER (WHERE b.initiated_by = 'worker')::int AS worker_count
     FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS day
     LEFT JOIN bookings b
       ON b.status = 'cancelled'
       AND b.cancelled_at IS NOT NULL
       AND b.initiated_by IN ('customer', 'worker')
       AND date_trunc('day', b.cancelled_at) = day
     GROUP BY day
     ORDER BY day`
  );
  return rows.map((r) => ({ day: r.day, customerCount: r.customer_count, workerCount: r.worker_count }));
}

// Payment method distribution is only meaningful over completed bookings -
// payment_method is set at completion (see bookings.model.js setCompleted)
// and defaults to 'cash' until then, which would otherwise flood the
// breakdown with bookings that haven't actually been paid yet.
// Payment status has no dedicated column (there's no separate "payment
// collected" event - cash changes hands at the same moment a job is marked
// complete), so it's derived from booking status: completed = paid,
// still-active (requested/accepted/in_progress) = pending. Cancelled/
// declined bookings never owed a payment and are left out of this half.
export async function getPaymentBreakdown() {
  const [byMethod, byStatus] = await Promise.all([
    pool.query(
      `SELECT payment_method, COUNT(*)::int AS count, COALESCE(SUM(price), 0)::numeric AS total
       FROM bookings WHERE status = 'completed' GROUP BY payment_method`
    ),
    pool.query(
      `SELECT CASE WHEN status = 'completed' THEN 'paid' ELSE 'pending' END AS payment_status,
              COUNT(*)::int AS count, COALESCE(SUM(price), 0)::numeric AS total
       FROM bookings WHERE status IN ('completed', 'requested', 'accepted', 'in_progress')
       GROUP BY CASE WHEN status = 'completed' THEN 'paid' ELSE 'pending' END`
    ),
  ]);
  return {
    byMethod: byMethod.rows.map((r) => ({ method: r.payment_method, count: r.count, total: Number(r.total) })),
    byStatus: byStatus.rows.map((r) => ({ status: r.payment_status, count: r.count, total: Number(r.total) })),
  };
}

// ---- Worker Performance tab (target-spec Phase 9/10, Users & Verification) ----
// The individual view of numbers already computed elsewhere for the
// Dashboard - same FLAGGED_CTES_SQL/TIER_CASE_SQL fragments as
// getFlaggedRate/getPerformanceTierSplit/listUsers above, just scoped to
// one worker_id instead of aggregated across all of them. Earnings (with
// its monthly trend) comes from commissionLedgerModel.findTotals/
// findMonthlySeries in admin.service.js, not duplicated here - those
// already exist, worker-scoped, for the Earnings screen.
export async function getWorkerPerformance(workerId) {
  const { rows } = await pool.query(
    `WITH ${FLAGGED_CTES_SQL}
     SELECT wp.rating_avg,
            wp.jobs_completed_count,
            wp.trust_score,
            ${TIER_CASE_SQL} AS tier,
            COALESCE(t.completed_count, 0)::int AS completed_count,
            COALESCE(t.worker_cancelled_count, 0)::int AS worker_cancelled_count,
            f.high_cancellation_rate,
            f.low_rating,
            f.inactive
     FROM worker_profiles wp
     LEFT JOIN terminal t ON t.worker_id = wp.user_id
     LEFT JOIN flags f ON f.worker_id = wp.user_id
     WHERE wp.user_id = $1`,
    [workerId]
  );
  const r = rows[0];
  if (!r) return null;

  const terminalCount = r.completed_count + r.worker_cancelled_count;
  return {
    ratingAvg: Number(r.rating_avg),
    jobsCompletedCount: r.jobs_completed_count,
    trustScore: r.trust_score,
    tier: r.tier,
    completedCount: r.completed_count,
    workerCancelledCount: r.worker_cancelled_count,
    // null (not 0) when the worker has no terminal jobs yet - "0%
    // cancellation rate" would otherwise misread as a clean record rather
    // than "not enough data", same reasoning FLAG_MIN_TERMINAL_JOBS below
    // already applies to whether this worker is flagged for it at all.
    cancellationRate: terminalCount > 0 ? r.worker_cancelled_count / terminalCount : null,
    // Null (not false) when this worker isn't currently eligible to be
    // flagged at all (verification_status != 'approved' - see
    // FLAGGED_CTES_SQL's own WHERE clause), rather than reading as "flagged
    // false" for a worker the flagging logic never actually evaluated.
    flags:
      r.high_cancellation_rate === null
        ? null
        : {
            highCancellationRate: r.high_cancellation_rate,
            lowRating: r.low_rating,
            inactive: r.inactive,
          },
  };
}

// ---- Finance (lean, target-spec Phase 8/9) ----
// Supersedes the old thin "Accounting" stub above (a coming-soon page with
// only a backend summary nobody ever surfaced) - this is the real section
// the spec's Build order item 8 asks for, in its old nav slot.
//
// Revenue view: total revenue (GMV - the sum of what customers paid across
// completed bookings), total commission (the platform's own cut of that
// GMV, via commission_ledger.commission_amount - the same figure
// getDashboardStats/getAnalytics already call "totalCommission"), total
// refunds (hardcoded 0 - no refund/payout module exists anywhere in this
// app; see auditLog.service.js's own note: "nothing charges/refunds money
// yet"), and net income.
//
// Net income = commission - refunds, NOT "revenue - commission - refunds"
// despite that being the phrasing this phase's instruction used - in a
// marketplace-commission model, GMV minus commission is what's left for
// WORKERS, not platform income, so subtracting commission from GMV would
// show ~85% of gross bookings as "net income," which is money the platform
// never touches. Confirmed with the person who asked for this phase before
// implementing it this way. This also matches how the old sajilo-backend
// reference (platformRevenueService.js) actually behaves - it sums two
// separate income accounts (revenue + commission) minus refunds, never
// subtracts one from the other; "total revenue" there was a distinct
// non-commission income stream, not GMV, which this leaner schema has no
// equivalent of.
const REVENUE_RANGE_SQL = {
  month: "date_trunc('month', now())",
  '30d': "now() - interval '30 days'",
  all: null,
};

export async function getRevenueSummary(range = 'all') {
  const fromExpr = Object.prototype.hasOwnProperty.call(REVENUE_RANGE_SQL, range)
    ? REVENUE_RANGE_SQL[range]
    : REVENUE_RANGE_SQL.all;
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(job_price), 0)::numeric AS total_revenue,
            COALESCE(SUM(commission_amount), 0)::numeric AS total_commission,
            COUNT(*)::int AS completed_jobs
     FROM commission_ledger
     ${fromExpr ? `WHERE created_at >= ${fromExpr}` : ''}`
  );
  const r = rows[0];
  const totalCommission = Number(r.total_commission);
  const totalRefunds = 0;
  return {
    range,
    totalRevenue: Number(r.total_revenue),
    totalCommission,
    totalRefunds,
    netIncome: totalCommission - totalRefunds,
    completedJobs: r.completed_jobs,
  };
}

function toExpense(row) {
  return {
    id: row.id,
    vendor: row.vendor,
    category: row.category,
    amount: Number(row.amount),
    status: row.status,
    expenseDate: row.expense_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

const EXPENSES_LIST_CAP = 200;

export async function listExpenses() {
  const { rows } = await pool.query(
    `SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC LIMIT ${EXPENSES_LIST_CAP}`
  );
  return rows.map(toExpense);
}

// Dashboard's expense summary card (target-spec Phase 8/9) - total
// currently outstanding (status='pending', regardless of when incurred)
// and total incurred this calendar month (regardless of status) - the
// same two numbers the Finance screen's own Expenses tab surfaces, so the
// dashboard card and the screen it links to can't disagree.
export async function getExpenseSummary() {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::numeric AS pending_total,
       COALESCE(SUM(amount) FILTER (WHERE expense_date >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS this_month_total
     FROM expenses`
  );
  const r = rows[0];
  return { pendingTotal: Number(r.pending_total), thisMonthTotal: Number(r.this_month_total) };
}

export async function findExpenseById(id) {
  const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
  return rows[0] ? toExpense(rows[0]) : null;
}

export async function createExpense({ vendor, category, amount, status, expenseDate }, adminId) {
  const { rows } = await pool.query(
    `INSERT INTO expenses (vendor, category, amount, status, expense_date, paid_at, created_by)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $4::varchar = 'paid' THEN now() ELSE NULL END, $6)
     RETURNING *`,
    [vendor, category, amount, status, expenseDate, adminId]
  );
  return toExpense(rows[0]);
}

// Same shape update whichever field changed, including status - paid_at is
// recomputed from the new status every time (stamped on entry into 'paid',
// cleared on any edit back out of it) rather than only touched by the
// dedicated "mark paid" action below, so an admin fixing a mis-entered
// status via the edit form still gets a correct paid_at.
export async function updateExpense(id, { vendor, category, amount, status, expenseDate }) {
  const { rows } = await pool.query(
    `UPDATE expenses
     SET vendor = $2, category = $3, amount = $4, status = $5, expense_date = $6, updated_at = now(),
         paid_at = CASE WHEN $5::varchar = 'paid' THEN COALESCE(paid_at, now()) ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [id, vendor, category, amount, status, expenseDate]
  );
  return rows[0] ? toExpense(rows[0]) : null;
}

export async function setExpensePaid(id) {
  const { rows } = await pool.query(
    `UPDATE expenses SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ? toExpense(rows[0]) : null;
}

export async function deleteExpense(id) {
  const { rows } = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

// One consolidated entry per pending worker (Round F, 2026-09-27) -
// replaces the old one-row-per-document queue (a worker with two pending
// identity documents used to show as two disconnected rows). Only the
// original identity-verification documents feed this (worker_service_id
// IS NULL) - a document submitted as evidence for a specific cross-
// category service request is still surfaced via listPendingServices'
// documentId instead, unchanged. Clicking through to review happens on
// the same detail page as Users (GET /admin/users/:id), reusing that
// screen rather than a separate one - see AdminUserDetail.jsx.
function toPendingWorkerVerification(row) {
  return {
    kind: 'worker_verification',
    workerId: row.worker_id,
    workerName: row.worker_name,
    profileImageUrl: row.profile_image_url,
    pendingCount: row.pending_count,
    rejectedCount: row.rejected_count,
    totalCount: row.total_count,
    createdAt: row.created_at,
  };
}

export async function listPendingWorkerVerifications() {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id, u.full_name AS worker_name, u.profile_image_url,
            MIN(vd.created_at) AS created_at,
            COUNT(*) FILTER (WHERE vd.status = 'pending')::int AS pending_count,
            COUNT(*) FILTER (WHERE vd.status = 'rejected')::int AS rejected_count,
            COUNT(*)::int AS total_count
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     JOIN verification_documents vd ON vd.worker_id = u.id AND vd.worker_service_id IS NULL
     WHERE wp.verification_status = 'pending'
     GROUP BY u.id, u.full_name, u.profile_image_url
     ORDER BY MIN(vd.created_at) ASC`
  );
  return rows.map(toPendingWorkerVerification);
}

function toPendingService(row) {
  return {
    kind: 'service',
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    serviceName: row.service_name,
    category: row.category,
    highRisk: row.high_risk,
    price: Number(row.price),
    // The supporting document submitted alongside this specific request,
    // when the category is high-risk - null for a low-risk cross-category
    // add, which needs no document (see workers.service.js addService).
    // Just the id, never the file itself/its URL - the client fetches it
    // through GET /admin/documents/:id/file, which streams it server-side
    // after an admin auth check instead of ever exposing the raw
    // Cloudinary URL.
    documentId: row.document_id,
    createdAt: row.created_at,
  };
}

export async function listPendingServices() {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category, s.high_risk, u.full_name AS worker_name,
            (SELECT vd.id FROM verification_documents vd
             WHERE vd.worker_service_id = ws.id ORDER BY vd.created_at DESC LIMIT 1) AS document_id
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     JOIN users u ON u.id = ws.worker_id
     WHERE ws.approval_status = 'pending'
     ORDER BY ws.created_at ASC`
  );
  return rows.map(toPendingService);
}

export async function findDocumentById(id) {
  const { rows } = await pool.query('SELECT * FROM verification_documents WHERE id = $1', [id]);
  return rows[0] || null;
}

// Whether this worker still has any document left that isn't approved
// (pending review, or rejected and awaiting resubmission) - the basis for
// "verified" being all-or-nothing (see admin.service.js decideDocument).
// A single rejected document no longer flips the worker straight to
// 'rejected' the way it used to; it just means this count stays above
// zero until they resubmit and it's approved too.
export async function countNonApprovedDocumentsForWorker(workerId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM verification_documents
     WHERE worker_id = $1 AND worker_service_id IS NULL AND status != 'approved'`,
    [workerId]
  );
  return rows[0].count;
}

export async function decideDocument(id, { status, adminId, comment }) {
  const { rows } = await pool.query(
    `UPDATE verification_documents
     SET status = $2, reviewed_by = $3, reviewed_at = now(), review_comment = $4
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, status, adminId, comment ?? null]
  );
  return rows[0] || null;
}

// All-time count, not scoped to one application attempt - the basis for
// the 3-strikes support escalation (see admin.service.js decideDocument).
export async function countRejectedDocumentsForWorker(workerId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM verification_documents WHERE worker_id = $1 AND status = 'rejected'",
    [workerId]
  );
  return rows[0].count;
}

// approved_at is stamped every time status flips to 'approved' (including a
// re-approval after a rejected reapply) - the trust-score grace period
// restarts along with it, which matches "newly (re)joined" the same way a
// first approval would.
export async function setWorkerVerificationStatus(workerId, status) {
  await pool.query(
    `UPDATE worker_profiles
     SET verification_status = $1::varchar,
         approved_at = CASE WHEN $1::varchar = 'approved' THEN now() ELSE approved_at END,
         updated_at = now()
     WHERE user_id = $2`,
    [status, workerId]
  );
}

export async function findWorkerServiceById(id) {
  const { rows } = await pool.query('SELECT * FROM worker_services WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function decideWorkerService(id, { status, adminId, comment }) {
  const { rows } = await pool.query(
    `UPDATE worker_services
     SET approval_status = $2, reviewed_by = $3, reviewed_at = now(), review_comment = $4
     WHERE id = $1 AND approval_status = 'pending'
     RETURNING *`,
    [id, status, adminId, comment ?? null]
  );
  if (rows[0]) {
    // Mirrors the service's outcome onto its linked supporting document (if
    // any), so that document doesn't linger "pending" forever in isolation -
    // the service decision is the one action that resolves both.
    await pool.query(
      `UPDATE verification_documents SET status = $2, reviewed_by = $3, reviewed_at = now()
       WHERE worker_service_id = $1`,
      [id, status, adminId]
    );
  }
  return rows[0] || null;
}

// ---- Admin RBAC / Staff (Round E, 2026-09-27) ----

// Looked up fresh per request by adminAccess.middleware.js, not cached in
// the JWT - a department grant change from the Staff screen has to apply
// immediately, not on the affected staffer's next login.
export async function getAdminAccess(userId) {
  const { rows } = await pool.query('SELECT is_super_admin FROM users WHERE id = $1', [userId]);
  const isSuperAdmin = rows[0]?.is_super_admin ?? false;
  const { rows: grantRows } = await pool.query(
    'SELECT department FROM admin_department_grants WHERE user_id = $1',
    [userId]
  );
  return { isSuperAdmin, departments: grantRows.map((r) => r.department) };
}

function toStaffSummary(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    isSuperAdmin: row.is_super_admin,
    createdAt: row.created_at,
  };
}

export async function listStaff() {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC"
  );
  const staff = rows.map(toStaffSummary);
  const { rows: grantRows } = await pool.query('SELECT user_id, department FROM admin_department_grants');
  const byUser = new Map();
  for (const g of grantRows) {
    if (!byUser.has(g.user_id)) byUser.set(g.user_id, []);
    byUser.get(g.user_id).push(g.department);
  }
  return staff.map((s) => ({ ...s, departments: byUser.get(s.id) ?? [] }));
}

export async function findStaffById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'admin'", [id]);
  if (!rows[0]) return null;
  const { departments } = await getAdminAccess(id);
  return { ...toStaffSummary(rows[0]), departments };
}

// Replaces the full grant set in one transaction (unset-then-set, same
// pattern as addresses.model.js's setDefault) rather than diffing - the
// Staff screen always submits the complete desired department list.
export async function setStaffAccess(id, { departments, isSuperAdmin }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET is_super_admin = $2, updated_at = now() WHERE id = $1', [
      id,
      isSuperAdmin,
    ]);
    await client.query('DELETE FROM admin_department_grants WHERE user_id = $1', [id]);
    for (const department of departments) {
      await client.query(
        'INSERT INTO admin_department_grants (user_id, department) VALUES ($1, $2)',
        [id, department]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return findStaffById(id);
}

// ---- Users (Round A) ----

function toUserSummary(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    profileImageUrl: row.profile_image_url,
    role: row.role,
    moderationStatus: row.moderation_status,
    verificationStatus: row.verification_status ?? null,
    // Only present when listUsers' own joins select them (sort=rating/
    // earnings context) - every other caller of toUserSummary queries
    // `users` alone, so these read undefined -> null there, harmless.
    ratingAvg: row.rating_avg != null ? Number(row.rating_avg) : null,
    totalEarnings: row.total_earnings != null ? Number(row.total_earnings) : null,
    createdAt: row.created_at,
  };
}

// verification_status is only meaningful for workers - the LEFT JOIN just
// leaves it null for customers/admins rather than needing a separate query
// shape per role. No pagination yet (LIMIT is a defensive cap, not a page
// size) - real pagination is a later-round concern once there's enough
// production data for it to matter.
//
// A worker who isn't fully verified yet (verification_status !=
// 'approved' - still 'pending', or 'unsubmitted' before they've even
// started onboarding) is deliberately excluded here: they're not a real,
// bookable user yet, and showing them as "active" in this list was
// misleading (see Approvals instead, which is where they belong until
// every document clears - admin.model.js listPendingWorkerVerifications).
// Customers/admins have no worker_profiles row at all (verification_status
// is NULL via the LEFT JOIN) so the role check on the left of that OR
// always passes for them, unaffected by this.
const USERS_LIST_CAP = 200;

// sort/flagged/tier (target-spec Phase 7) - the "Plumbing" the Dashboard
// rework's drill-through cards need: sort by rating (Rating distribution)
// or earnings (Earnings concentration), filter to flagged-only (Flagged
// rate) or by tier (Performance tier split). flagged/tier reuse the exact
// same SQL (FLAGGED_CTES_SQL/TIER_CASE_SQL) the dashboard's own aggregates
// read, so a card's percentage and the list it links to never disagree.
// Earnings sort needs a per-worker total from commission_ledger, which
// customers/admins never have a row in - they just sort last (NULLS LAST),
// unaffected since these sorts are only ever driven from worker-scoped
// dashboard links in practice.
export async function listUsers({ role, status, q, flagged, tier, sort }) {
  const orderBy =
    sort === 'rating'
      ? 'wp.rating_avg DESC NULLS LAST, u.created_at DESC'
      : sort === 'earnings'
        ? 'el.total_earnings DESC NULLS LAST, u.created_at DESC'
        : 'u.created_at DESC';

  const { rows } = await pool.query(
    `WITH ${FLAGGED_CTES_SQL}
     SELECT u.*, wp.verification_status, wp.rating_avg, el.total_earnings
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN (
       SELECT worker_id, SUM(job_price)::numeric AS total_earnings
       FROM commission_ledger GROUP BY worker_id
     ) el ON el.worker_id = u.id
     WHERE ($1::text IS NULL OR u.role = $1)
       AND ($2::text IS NULL OR u.moderation_status = $2)
       AND ($3::text IS NULL OR u.full_name ILIKE '%' || $3 || '%' OR u.phone ILIKE '%' || $3 || '%')
       AND (u.role != 'worker' OR wp.verification_status = 'approved')
       AND ($4::boolean IS NOT TRUE OR u.id IN (
         SELECT worker_id FROM flags WHERE high_cancellation_rate OR low_rating OR inactive
       ))
       AND ($5::text IS NULL OR (${TIER_CASE_SQL}) = $5)
     ORDER BY ${orderBy}
     LIMIT ${USERS_LIST_CAP}`,
    [role || null, status || null, q || null, flagged === true, tier || null]
  );
  return rows.map(toUserSummary);
}

export async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

function toUserDetail(row) {
  return {
    ...toUserSummary(row),
    adminNotes: row.admin_notes,
  };
}

export async function findUserDetail(id) {
  const { rows } = await pool.query(
    `SELECT u.*, wp.verification_status FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] ? toUserDetail(rows[0]) : null;
}

// Lean summary rows for a user's booking history - not the full
// bookings.model.js shape (no chat/commission join), just enough for a
// scannable list on the Users detail screen.
export async function listBookingsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.type, b.price, b.created_at, b.completed_at,
            b.customer_id, b.worker_id,
            cu.full_name AS customer_name, wu.full_name AS worker_name,
            (SELECT string_agg(s.name, ', ' ORDER BY s.name)
             FROM booking_services bs JOIN services s ON s.id = bs.service_id
             WHERE bs.booking_id = b.id) AS service_names
     FROM bookings b
     JOIN users cu ON cu.id = b.customer_id
     LEFT JOIN users wu ON wu.id = b.worker_id
     WHERE b.customer_id = $1 OR b.worker_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    type: row.type,
    price: row.price === null ? null : Number(row.price),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    customerId: row.customer_id,
    customerName: row.customer_name,
    workerId: row.worker_id,
    workerName: row.worker_name,
    serviceNames: row.service_names ?? '',
  }));
}

export async function setUserModerationStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE users SET moderation_status = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [id, status]
  );
  return rows[0] ? toUserSummary(rows[0]) : null;
}

export async function setUserAdminNotes(id, notes) {
  const { rows } = await pool.query(
    'UPDATE users SET admin_notes = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [id, notes]
  );
  return rows[0] ? toUserDetail(rows[0]) : null;
}

// ---- Bookings (Round A) ----

function toBookingSummary(row) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    price: row.price === null ? null : Number(row.price),
    addressLabel: row.address_label,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    customerId: row.customer_id,
    customerName: row.customer_name,
    workerId: row.worker_id,
    workerName: row.worker_name,
    flagged: row.flagged,
    serviceNames: row.service_names ?? '',
  };
}

const BOOKINGS_LIST_CAP = 200;

// paymentMethod/paymentStatus (target-spec Phase 7) - the Dashboard
// rework's payment-breakdown click-through. paymentStatus has no column of
// its own, same derivation getPaymentBreakdown above already uses
// (completed = paid, still-active = pending).
export async function listBookingsAdmin({ status, type, from, to, paymentMethod, paymentStatus }) {
  const { rows } = await pool.query(
    `SELECT b.*, cu.full_name AS customer_name, wu.full_name AS worker_name,
            (SELECT string_agg(s.name, ', ' ORDER BY s.name)
             FROM booking_services bs JOIN services s ON s.id = bs.service_id
             WHERE bs.booking_id = b.id) AS service_names
     FROM bookings b
     JOIN users cu ON cu.id = b.customer_id
     LEFT JOIN users wu ON wu.id = b.worker_id
     WHERE ($1::text IS NULL OR b.status = $1)
       AND ($2::text IS NULL OR b.type = $2)
       AND ($3::timestamptz IS NULL OR b.created_at >= $3)
       AND ($4::timestamptz IS NULL OR b.created_at <= $4)
       AND ($5::text IS NULL OR b.payment_method = $5)
       AND (
         $6::text IS NULL
         OR ($6 = 'paid' AND b.status = 'completed')
         OR ($6 = 'pending' AND b.status IN ('requested', 'accepted', 'in_progress'))
       )
     ORDER BY b.created_at DESC
     LIMIT ${BOOKINGS_LIST_CAP}`,
    [status || null, type || null, from || null, to || null, paymentMethod || null, paymentStatus || null]
  );
  return rows.map(toBookingSummary);
}

export async function findBookingRawById(id) {
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function setBookingFlag(id, { flagged, reason }) {
  const { rows } = await pool.query(
    'UPDATE bookings SET flagged = $2, flag_reason = $3 WHERE id = $1 RETURNING *',
    [id, flagged, reason ?? null]
  );
  return rows[0] || null;
}

// ---- Categories/Services (Round B) ----

function toServiceAdmin(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    highRisk: row.high_risk,
    createdAt: row.created_at,
  };
}

// Includes inactive services (unlike the public catalog) - the admin needs
// to see and be able to reactivate them.
export async function listServicesAdmin() {
  const { rows } = await pool.query('SELECT * FROM services ORDER BY category, name');
  return rows.map(toServiceAdmin);
}

// Pending cross-category worker-service requests, grouped by category -
// surfaced read-only on the Categories/Services screen for context (the
// queue itself is still only actionable from Approvals).
export async function countPendingServiceRequestsByCategory() {
  const { rows } = await pool.query(
    `SELECT s.category, COUNT(*)::int AS count
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.approval_status = 'pending'
     GROUP BY s.category`
  );
  return Object.fromEntries(rows.map((row) => [row.category, row.count]));
}

export async function findServiceAdminById(id) {
  const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
  return rows[0] ? toServiceAdmin(rows[0]) : null;
}

export async function createService({ category, name, description }) {
  const { rows } = await pool.query(
    'INSERT INTO services (category, name, description) VALUES ($1, $2, $3) RETURNING *',
    [category, name, description ?? null]
  );
  return toServiceAdmin(rows[0]);
}

export async function updateService(id, { category, name, description }) {
  const { rows } = await pool.query(
    'UPDATE services SET category = $2, name = $3, description = $4 WHERE id = $1 RETURNING *',
    [id, category, name, description ?? null]
  );
  return rows[0] ? toServiceAdmin(rows[0]) : null;
}

export async function setServiceActive(id, isActive) {
  const { rows } = await pool.query(
    'UPDATE services SET is_active = $2 WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return rows[0] ? toServiceAdmin(rows[0]) : null;
}

export async function setServiceHighRisk(id, highRisk) {
  const { rows } = await pool.query(
    'UPDATE services SET high_risk = $2 WHERE id = $1 RETURNING *',
    [id, highRisk]
  );
  return rows[0] ? toServiceAdmin(rows[0]) : null;
}

// ---- Disputes (Round C) ----

function toDisputeSummary(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerName: row.customer_name,
    workerName: row.worker_name,
    raisedBy: row.raised_by,
    raisedByName: row.raised_by_name,
    reason: row.reason,
    status: row.status,
    atFault: row.at_fault,
    department: row.department,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

const DISPUTES_LIST_CAP = 200;

// departments is null for a Super Admin (sees every department's queue,
// per the decision doc) - any other caller passes their own granted
// departments, and only disputes currently tagged with one of them show up
// (escalating one moves it out of the sender's queue into the recipient's).
export async function listDisputes({ status, departments }) {
  const { rows } = await pool.query(
    `SELECT d.*, cu.full_name AS customer_name, wu.full_name AS worker_name, ru.full_name AS raised_by_name
     FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     JOIN users cu ON cu.id = b.customer_id
     LEFT JOIN users wu ON wu.id = b.worker_id
     JOIN users ru ON ru.id = d.raised_by
     WHERE ($1::text IS NULL OR d.status = $1)
       AND ($2::text[] IS NULL OR d.department = ANY($2::text[]))
     ORDER BY d.created_at DESC
     LIMIT ${DISPUTES_LIST_CAP}`,
    [status || null, departments ?? null]
  );
  return rows.map(toDisputeSummary);
}

function toDisputeDetail(row) {
  return {
    ...toDisputeSummary(row),
    resolutionNotes: row.resolution_notes,
    resolvedBy: row.resolved_by,
  };
}

export async function findDisputeById(id) {
  const { rows } = await pool.query(
    `SELECT d.*, cu.full_name AS customer_name, wu.full_name AS worker_name, ru.full_name AS raised_by_name
     FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     JOIN users cu ON cu.id = b.customer_id
     LEFT JOIN users wu ON wu.id = b.worker_id
     JOIN users ru ON ru.id = d.raised_by
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] ? toDisputeDetail(rows[0]) : null;
}

export async function createDispute({ bookingId, raisedByUserId, reason }) {
  const { rows } = await pool.query(
    'INSERT INTO disputes (booking_id, raised_by, reason) VALUES ($1, $2, $3) RETURNING id',
    [bookingId, raisedByUserId, reason]
  );
  return findDisputeById(rows[0].id);
}

export async function resolveDispute(id, { status, resolutionNotes, atFault, adminId }) {
  await pool.query(
    `UPDATE disputes
     SET status = $2, resolution_notes = $3, resolved_by = $4, resolved_at = now(), at_fault = $5
     WHERE id = $1`,
    [id, status, resolutionNotes ?? null, adminId, atFault ?? null]
  );
  return findDisputeById(id);
}

export async function setDisputeDepartment(id, department) {
  await pool.query('UPDATE disputes SET department = $2 WHERE id = $1', [id, department]);
  return findDisputeById(id);
}

// All-time count of disputes an admin resolved at-fault: worker - the basis
// for the trust score's dispute-free-record deduction (§1 of the trust
// score spec), distinct from the rolling-30-day count below used for the
// 3-strikes-style admin-review escalation (§3).
export async function countAtFaultDisputesForWorker(workerId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     WHERE b.worker_id = $1 AND d.at_fault = 'worker'`,
    [workerId]
  );
  return rows[0].count;
}

export async function countAtFaultDisputesForWorkerRolling30(workerId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     WHERE b.worker_id = $1 AND d.at_fault = 'worker' AND d.resolved_at >= now() - INTERVAL '30 days'`,
    [workerId]
  );
  return rows[0].count;
}

// ---- Support tickets (Round C) ----

function toTicketSummary(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    // The Live Chat console's "category" filter (target-spec Phase 3) -
    // customer-initiated vs. worker-initiated - reads straight off the
    // ticket opener's own role, nothing new to track.
    userRole: row.user_role,
    bookingId: row.booking_id,
    subject: row.subject,
    priority: row.priority,
    status: row.status,
    department: row.department,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TICKETS_LIST_CAP = 200;

// departments is null for a Super Admin (sees every department's queue) -
// see listDisputes above for the identical convention.
export async function listSupportTickets({ status, priority, q, departments }) {
  const { rows } = await pool.query(
    `SELECT t.*, u.full_name AS user_name, u.role AS user_role
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     WHERE ($1::text IS NULL OR t.status = $1)
       AND ($2::text IS NULL OR t.priority = $2)
       AND ($3::text IS NULL OR t.subject ILIKE '%' || $3 || '%' OR u.full_name ILIKE '%' || $3 || '%')
       AND ($4::text[] IS NULL OR t.department = ANY($4::text[]))
     ORDER BY t.created_at DESC
     LIMIT ${TICKETS_LIST_CAP}`,
    [status || null, priority || null, q || null, departments ?? null]
  );
  return rows.map(toTicketSummary);
}

// Live Chat console (target-spec Phase 3) - "active" means still open or
// being worked (resolved/closed tickets are async-queue business, not
// "needs help right now"). status here is optional and, when given, must
// already be one of those two values (the controller only ever passes
// what the frontend's two-option status filter offers) - it narrows
// within the active set rather than replacing it, so passing an invalid
// value here would just (harmlessly) match nothing rather than leaking a
// resolved/closed ticket through.
const LIVE_STATUSES = ['open', 'in_progress'];

export async function listActiveSupportTickets({ status, role, departments }) {
  const { rows } = await pool.query(
    `SELECT t.*, u.full_name AS user_name, u.role AS user_role
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     WHERE t.status = ANY($1::text[])
       AND ($2::text IS NULL OR t.status = $2)
       AND ($3::text IS NULL OR u.role = $3)
       AND ($4::text[] IS NULL OR t.department = ANY($4::text[]))
     ORDER BY t.updated_at DESC
     LIMIT ${TICKETS_LIST_CAP}`,
    [LIVE_STATUSES, status && LIVE_STATUSES.includes(status) ? status : null, role || null, departments ?? null]
  );
  return rows.map(toTicketSummary);
}

export async function findSupportTicketById(id) {
  const { rows } = await pool.query(
    `SELECT t.*, u.full_name AS user_name, u.role AS user_role
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] ? toTicketSummary(rows[0]) : null;
}

function toTicketMessage(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function listTicketMessages(ticketId) {
  const { rows } = await pool.query(
    `SELECT m.*, u.full_name AS sender_name
     FROM support_ticket_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.ticket_id = $1
     ORDER BY m.created_at ASC`,
    [ticketId]
  );
  return rows.map(toTicketMessage);
}

export async function createSupportTicket({ userId, bookingId, subject, priority, message }) {
  const { rows } = await pool.query(
    `INSERT INTO support_tickets (user_id, booking_id, subject, priority)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, bookingId ?? null, subject, priority]
  );
  const ticketId = rows[0].id;
  await pool.query(
    'INSERT INTO support_ticket_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3)',
    [ticketId, userId, message]
  );
  return findSupportTicketById(ticketId);
}

export async function addTicketMessage(ticketId, { senderId, message }) {
  await pool.query(
    'INSERT INTO support_ticket_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3)',
    [ticketId, senderId, message]
  );
  await pool.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [ticketId]);
  return listTicketMessages(ticketId);
}

export async function setTicketStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE support_tickets SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
    [id, status]
  );
  return rows[0] ? findSupportTicketById(id) : null;
}

export async function setTicketDepartment(id, department) {
  await pool.query('UPDATE support_tickets SET department = $2, updated_at = now() WHERE id = $1', [
    id,
    department,
  ]);
  return findSupportTicketById(id);
}

// ---- Department escalation log (shared by disputes + support tickets) ----

function toEscalation(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fromDepartment: row.from_department,
    toDepartment: row.to_department,
    escalatedBy: row.escalated_by,
    escalatedByName: row.escalated_by_name,
    createdAt: row.created_at,
  };
}

export async function logEscalation({ entityType, entityId, fromDepartment, toDepartment, escalatedBy }) {
  await pool.query(
    `INSERT INTO department_escalations (entity_type, entity_id, from_department, to_department, escalated_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityType, entityId, fromDepartment, toDepartment, escalatedBy]
  );
}

export async function listEscalations(entityType, entityId) {
  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS escalated_by_name
     FROM department_escalations e
     JOIN users u ON u.id = e.escalated_by
     WHERE e.entity_type = $1 AND e.entity_id = $2
     ORDER BY e.created_at ASC`,
    [entityType, entityId]
  );
  return rows.map(toEscalation);
}

// ---- Publications (2026-09-25, replaces the old Announcements half of
// content_items) + Policies (Round D) ----

// isLive is computed here rather than stored - no cron exists to flip
// status at scheduled_at/expires_at, so "live" is just "published, and any
// schedule window says now is within it" recalculated on every read.
function toContentItem(row) {
  const now = Date.now();
  const scheduledAt = row.scheduled_at ? new Date(row.scheduled_at) : null;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isLive =
    row.status === 'published' &&
    (!scheduledAt || scheduledAt.getTime() <= now) &&
    (!expiresAt || expiresAt.getTime() > now);

  return {
    id: row.id,
    policyType: row.policy_type,
    title: row.title,
    subtitle: row.subtitle,
    effectiveDate: row.effective_date,
    docNote: row.doc_note,
    // JSONB - node-postgres already hands this back parsed, not a string.
    sections: row.sections,
    audience: row.audience,
    status: row.status,
    isLive,
    scheduledAt: row.scheduled_at,
    expiresAt: row.expires_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublication(row) {
  const now = Date.now();
  const scheduledAt = row.scheduled_at ? new Date(row.scheduled_at) : null;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isLive =
    row.status === 'published' &&
    (!scheduledAt || scheduledAt.getTime() <= now) &&
    (!expiresAt || expiresAt.getTime() > now);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label,
    ctaLink: row.cta_link,
    promoCode: row.promo_code,
    audience: row.audience,
    status: row.status,
    isLive,
    scheduledAt: row.scheduled_at,
    expiresAt: row.expires_at,
    publishedAt: row.published_at,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPublications({ type, status, audience }) {
  const { rows } = await pool.query(
    `SELECT * FROM publications
     WHERE ($1::text IS NULL OR type = $1)
       AND ($2::text IS NULL OR status = $2)
       AND ($3::text IS NULL OR audience = $3)
     ORDER BY created_at DESC`,
    [type || null, status || null, audience || null]
  );
  return rows.map(toPublication);
}

export async function findPublicationById(id) {
  const { rows } = await pool.query('SELECT * FROM publications WHERE id = $1', [id]);
  return rows[0] ? toPublication(rows[0]) : null;
}

// Public-facing (Home/Dashboard promotion carousel) - every live
// type='promotion' publication for a given audience, ordered for the
// carousel. 'all'-audience publications show to every audience.
export async function listActivePromotions(audience) {
  const { rows } = await pool.query(
    `SELECT * FROM publications
     WHERE type = 'promotion'
       AND status = 'published'
       AND audience IN ($1, 'all')
       AND (scheduled_at IS NULL OR scheduled_at <= now())
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY display_order ASC, created_at DESC`,
    [audience]
  );
  return rows.map(toPublication);
}

export async function createPublication({
  type,
  title,
  body,
  imageUrl,
  ctaLabel,
  ctaLink,
  promoCode,
  audience,
  scheduledAt,
  expiresAt,
  displayOrder,
  createdBy,
}) {
  const { rows } = await pool.query(
    `INSERT INTO publications
       (type, title, body, image_url, cta_label, cta_link, promo_code, audience, scheduled_at, expires_at, display_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      type,
      title,
      body,
      imageUrl ?? null,
      ctaLabel ?? null,
      ctaLink ?? null,
      promoCode ?? null,
      audience,
      scheduledAt ?? null,
      expiresAt ?? null,
      displayOrder ?? 0,
      createdBy,
    ]
  );
  return toPublication(rows[0]);
}

export async function updatePublication(
  id,
  { title, body, imageUrl, ctaLabel, ctaLink, promoCode, audience, scheduledAt, expiresAt, displayOrder }
) {
  const { rows } = await pool.query(
    `UPDATE publications
     SET title = $2, body = $3, image_url = $4, cta_label = $5, cta_link = $6,
         promo_code = $7, audience = $8, scheduled_at = $9, expires_at = $10, display_order = $11, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      title,
      body,
      imageUrl ?? null,
      ctaLabel ?? null,
      ctaLink ?? null,
      promoCode ?? null,
      audience,
      scheduledAt ?? null,
      expiresAt ?? null,
      displayOrder ?? 0,
    ]
  );
  return rows[0] ? toPublication(rows[0]) : null;
}

// User ids to notify when a type='notification' publication is published -
// 'all' means every customer/worker (never admins, who don't need
// marketing/product notifications), 'customers'/'workers' map straight to
// that role.
export async function listUserIdsForAudience(audience) {
  const roles = audience === 'all' ? ['customer', 'worker'] : [audience === 'customers' ? 'customer' : 'worker'];
  const { rows } = await pool.query('SELECT id FROM users WHERE role = ANY($1::text[])', [roles]);
  return rows.map((r) => r.id);
}

export async function setPublicationStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE publications
     SET status = $2,
         published_at = CASE WHEN $3 THEN now() ELSE published_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, status === 'published']
  );
  return rows[0] ? toPublication(rows[0]) : null;
}

// The three policy_type rows are seeded once in the migration and never
// created/deleted from this screen - findPolicyByType is the only lookup,
// no listPolicies-by-id needed.
export async function findPolicyByType(policyType) {
  const { rows } = await pool.query(
    "SELECT * FROM content_items WHERE policy_type = $1 AND kind = 'policy'",
    [policyType]
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

export async function listPolicies() {
  const { rows } = await pool.query(
    "SELECT * FROM content_items WHERE kind = 'policy' ORDER BY policy_type"
  );
  return rows.map(toContentItem);
}

export async function updatePolicy(policyType, { title, subtitle, effectiveDate, docNote, sections }) {
  const { rows } = await pool.query(
    `UPDATE content_items
     SET title = $2, subtitle = $3, effective_date = $4, doc_note = $5, sections = $6, updated_at = now()
     WHERE policy_type = $1 AND kind = 'policy'
     RETURNING *`,
    [policyType, title, subtitle ?? null, effectiveDate ?? null, docNote ?? null, JSON.stringify(sections)]
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

export async function setPolicyStatus(policyType, status) {
  const { rows } = await pool.query(
    `UPDATE content_items
     SET status = $2,
         published_at = CASE WHEN $3 THEN now() ELSE published_at END,
         updated_at = now()
     WHERE policy_type = $1 AND kind = 'policy'
     RETURNING *`,
    [policyType, status, status === 'published']
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

// ---- Districts (Platform Configuration, target-spec Phase 6) ----
//
// The read-only side (workers.model.js listDistricts, GET /catalog/
// districts used by signup/worker-apply) only ever selects is_active =
// true rows - that query is untouched by this round. Everything below is
// the admin write-path that never existed before (districts migration
// 041/042 added the table and is_active column with no admin UI over
// either).

function toDistrictAdmin(row) {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

// Includes inactive districts (unlike the public catalog) - the whole
// point of this screen is to see and toggle the ones not live yet.
export async function listDistrictsAdmin() {
  const { rows } = await pool.query('SELECT * FROM districts ORDER BY name');
  return rows.map(toDistrictAdmin);
}

export async function findDistrictById(id) {
  const { rows } = await pool.query('SELECT * FROM districts WHERE id = $1', [id]);
  return rows[0] ? toDistrictAdmin(rows[0]) : null;
}

export async function createDistrict({ name, isActive }) {
  const { rows } = await pool.query(
    'INSERT INTO districts (name, is_active) VALUES ($1, $2) RETURNING *',
    [name, isActive]
  );
  return toDistrictAdmin(rows[0]);
}

export async function setDistrictActive(id, isActive) {
  const { rows } = await pool.query(
    'UPDATE districts SET is_active = $2 WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return rows[0] ? toDistrictAdmin(rows[0]) : null;
}
