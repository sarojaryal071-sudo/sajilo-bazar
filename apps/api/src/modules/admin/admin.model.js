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

// "Earning" = the worker's own gross job_price total, not the platform's
// commission cut - commission_ledger already carries one completed-booking
// row per worker, so this is a direct aggregate over it.
export async function getTopEarningWorkers(limit = 10) {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id, u.full_name, u.profile_image_url,
            SUM(cl.job_price)::numeric AS total_earnings, COUNT(*)::int AS completed_jobs
     FROM commission_ledger cl
     JOIN users u ON u.id = cl.worker_id
     GROUP BY u.id, u.full_name, u.profile_image_url
     ORDER BY total_earnings DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    workerId: r.worker_id,
    fullName: r.full_name,
    profileImageUrl: r.profile_image_url,
    totalEarnings: Number(r.total_earnings),
    completedJobs: r.completed_jobs,
  }));
}

// reviewsCount comes from the reviews table via bookings, not a stored
// counter - worker_profiles only stores the running rating_avg, no count.
export async function getTopRatedWorkers(limit = 10) {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id, u.full_name, u.profile_image_url, wp.rating_avg,
            COUNT(r.id)::int AS reviews_count
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     JOIN bookings b ON b.worker_id = wp.user_id
     JOIN reviews r ON r.booking_id = b.id
     GROUP BY u.id, u.full_name, u.profile_image_url, wp.rating_avg
     HAVING COUNT(r.id) > 0
     ORDER BY wp.rating_avg DESC, reviews_count DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    workerId: r.worker_id,
    fullName: r.full_name,
    profileImageUrl: r.profile_image_url,
    ratingAvg: Number(r.rating_avg),
    reviewsCount: r.reviews_count,
  }));
}

export async function getRecentLowRatings(limit = 10) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, b.id AS booking_id,
            w.id AS worker_id, w.full_name AS worker_name,
            c.full_name AS customer_name
     FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     LEFT JOIN users w ON w.id = b.worker_id
     JOIN users c ON c.id = b.customer_id
     WHERE r.rating <= 2
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    reviewId: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    bookingId: r.booking_id,
    workerId: r.worker_id,
    workerName: r.worker_name,
    customerName: r.customer_name,
  }));
}

// Split by who cancelled (business plan's own initiated_by column - same
// one trustScore's reliability window reads). null covers historical rows
// predating that column and admin overrides, neither of which are either
// party's own action.
export async function getCancellationStats() {
  const { rows } = await pool.query(
    `SELECT COALESCE(initiated_by, 'other') AS initiated_by, COUNT(*)::int AS count
     FROM bookings WHERE status = 'cancelled' GROUP BY COALESCE(initiated_by, 'other')`
  );
  const byInitiator = { worker: 0, customer: 0, other: 0 };
  for (const r of rows) byInitiator[r.initiated_by] = r.count;
  return { total: byInitiator.worker + byInitiator.customer + byInitiator.other, byInitiator };
}

// Flagged Workers (auto-flagged, simplified per the target spec - no
// rolling-window reuse of trustScore's exact logic, just the same three
// signals over a worker's full history): high cancellation rate, low
// rating, or inactivity. A worker can carry more than one reason.
const FLAG_CANCELLATION_RATE_THRESHOLD = 0.2;
const FLAG_MIN_TERMINAL_JOBS = 5;
const FLAG_LOW_RATING_THRESHOLD = 3.0;
const FLAG_MIN_RATED_JOBS = 3;
const FLAG_INACTIVITY_DAYS = 30;

export async function getFlaggedWorkers() {
  const { rows } = await pool.query(
    `WITH terminal AS (
       SELECT worker_id,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
              COUNT(*) FILTER (WHERE status = 'cancelled' AND initiated_by = 'worker') AS worker_cancelled_count,
              MAX(completed_at) AS last_completed_at
       FROM bookings
       WHERE worker_id IS NOT NULL AND (status = 'completed' OR (status = 'cancelled' AND initiated_by = 'worker'))
       GROUP BY worker_id
     )
     SELECT u.id AS worker_id, u.full_name, u.profile_image_url,
            wp.rating_avg, wp.jobs_completed_count, wp.approved_at,
            t.completed_count, t.worker_cancelled_count, t.last_completed_at,
            (t.completed_count + t.worker_cancelled_count) AS terminal_count
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     LEFT JOIN terminal t ON t.worker_id = wp.user_id
     WHERE wp.verification_status = 'approved'`
  );

  const flagged = [];
  for (const r of rows) {
    const reasons = [];
    const terminalCount = Number(r.terminal_count || 0);
    const workerCancelledCount = Number(r.worker_cancelled_count || 0);
    if (terminalCount >= FLAG_MIN_TERMINAL_JOBS && workerCancelledCount / terminalCount >= FLAG_CANCELLATION_RATE_THRESHOLD) {
      reasons.push('high_cancellation_rate');
    }
    if (r.jobs_completed_count >= FLAG_MIN_RATED_JOBS && Number(r.rating_avg) < FLAG_LOW_RATING_THRESHOLD) {
      reasons.push('low_rating');
    }
    const approvedDaysAgo = r.approved_at ? (Date.now() - new Date(r.approved_at).getTime()) / 86400000 : null;
    const daysSinceLastJob = r.last_completed_at ? (Date.now() - new Date(r.last_completed_at).getTime()) / 86400000 : null;
    const everWorked = r.jobs_completed_count > 0;
    if (
      approvedDaysAgo !== null &&
      approvedDaysAgo >= FLAG_INACTIVITY_DAYS &&
      (everWorked ? daysSinceLastJob >= FLAG_INACTIVITY_DAYS : true)
    ) {
      reasons.push('inactive');
    }
    if (reasons.length > 0) {
      flagged.push({
        workerId: r.worker_id,
        fullName: r.full_name,
        profileImageUrl: r.profile_image_url,
        ratingAvg: Number(r.rating_avg),
        jobsCompletedCount: r.jobs_completed_count,
        reasons,
      });
    }
  }
  return flagged;
}

// Top Performers: trust_score already IS "completion rate (via
// reliability) + rating + job-volume-gated tenure", exactly what the spec
// asks for - no separate computation needed, just rank what trustScore
// already persists. Requires a few completed jobs so one lucky 5-star
// booking can't outrank a proven worker (mirrors the grace-period idea).
const TOP_PERFORMER_MIN_JOBS = 3;

export async function getTopPerformers(limit = 10) {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id, u.full_name, u.profile_image_url,
            wp.trust_score, wp.rating_avg, wp.jobs_completed_count
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.trust_score IS NOT NULL AND wp.jobs_completed_count >= $2
     ORDER BY wp.trust_score DESC
     LIMIT $1`,
    [limit, TOP_PERFORMER_MIN_JOBS]
  );
  return rows.map((r) => ({
    workerId: r.worker_id,
    fullName: r.full_name,
    profileImageUrl: r.profile_image_url,
    trustScore: Number(r.trust_score),
    ratingAvg: Number(r.rating_avg),
    jobsCompletedCount: r.jobs_completed_count,
  }));
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

// Accounting (Finance-department screen) - deliberately thin today per the
// decision doc ("it'll fill in once refunds/payouts exist"); this is real
// content, not a placeholder, just a small one.
export async function getAccountingSummary() {
  const [totalCollected, outstanding] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commission_ledger'),
    pool.query(
      `SELECT COALESCE(SUM(CASE WHEN credit_balance_after < 0 THEN -credit_balance_after ELSE 0 END), 0) AS total
       FROM (
         SELECT DISTINCT ON (worker_id) worker_id, credit_balance_after
         FROM commission_ledger
         ORDER BY worker_id, created_at DESC
       ) latest`
    ),
  ]);
  return {
    totalCommissionCollected: Number(totalCollected.rows[0].total),
    totalCommissionOwedByWorkers: Number(outstanding.rows[0].total),
  };
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

export async function listUsers({ role, status, q }) {
  const { rows } = await pool.query(
    `SELECT u.*, wp.verification_status
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE ($1::text IS NULL OR u.role = $1)
       AND ($2::text IS NULL OR u.moderation_status = $2)
       AND ($3::text IS NULL OR u.full_name ILIKE '%' || $3 || '%' OR u.phone ILIKE '%' || $3 || '%')
       AND (u.role != 'worker' OR wp.verification_status = 'approved')
     ORDER BY u.created_at DESC
     LIMIT ${USERS_LIST_CAP}`,
    [role || null, status || null, q || null]
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

export async function listBookingsAdmin({ status, type, from, to }) {
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
     ORDER BY b.created_at DESC
     LIMIT ${BOOKINGS_LIST_CAP}`,
    [status || null, type || null, from || null, to || null]
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
    body: row.body,
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

export async function updatePolicy(policyType, { title, body }) {
  const { rows } = await pool.query(
    `UPDATE content_items SET title = $2, body = $3, updated_at = now()
     WHERE policy_type = $1 AND kind = 'policy'
     RETURNING *`,
    [policyType, title, body]
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
