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

function toPendingDocument(row) {
  return {
    kind: 'document',
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    docType: row.doc_type,
    fileUrl: row.file_url,
    createdAt: row.created_at,
  };
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
    documentUrl: row.document_url,
    createdAt: row.created_at,
  };
}

// The two independent approval queues from Phase 1 (identity/skill
// verification) and Phase 5 (cross-category service additions) - combined
// here into one chronological list since they're both "things an admin
// needs to say yes/no to", even though they update different tables.
// Documents tied to a specific service request (worker_service_id set)
// are excluded here - they're surfaced alongside that request via
// listPendingServices' documentUrl instead, so they don't show up twice.
export async function listPendingDocuments() {
  const { rows } = await pool.query(
    `SELECT vd.*, u.full_name AS worker_name
     FROM verification_documents vd
     JOIN users u ON u.id = vd.worker_id
     WHERE vd.status = 'pending' AND vd.worker_service_id IS NULL
     ORDER BY vd.created_at ASC`
  );
  return rows.map(toPendingDocument);
}

export async function listPendingServices() {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category, s.high_risk, u.full_name AS worker_name,
            (SELECT vd.file_url FROM verification_documents vd
             WHERE vd.worker_service_id = ws.id ORDER BY vd.created_at DESC LIMIT 1) AS document_url
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

// Documents pending for the same worker as the one just decided, so the
// service layer can tell whether this was the worker's last one.
export async function countPendingDocumentsForWorker(workerId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM verification_documents WHERE worker_id = $1 AND status = 'pending'",
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
     SET verification_status = $1,
         approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END,
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

// ---- Users (Round A) ----

function toUserSummary(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
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
const USERS_LIST_CAP = 200;

export async function listUsers({ role, status, q }) {
  const { rows } = await pool.query(
    `SELECT u.*, wp.verification_status
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE ($1::text IS NULL OR u.role = $1)
       AND ($2::text IS NULL OR u.moderation_status = $2)
       AND ($3::text IS NULL OR u.full_name ILIKE '%' || $3 || '%' OR u.phone ILIKE '%' || $3 || '%')
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
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

const DISPUTES_LIST_CAP = 200;

export async function listDisputes({ status }) {
  const { rows } = await pool.query(
    `SELECT d.*, cu.full_name AS customer_name, wu.full_name AS worker_name, ru.full_name AS raised_by_name
     FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     JOIN users cu ON cu.id = b.customer_id
     LEFT JOIN users wu ON wu.id = b.worker_id
     JOIN users ru ON ru.id = d.raised_by
     WHERE ($1::text IS NULL OR d.status = $1)
     ORDER BY d.created_at DESC
     LIMIT ${DISPUTES_LIST_CAP}`,
    [status || null]
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
    bookingId: row.booking_id,
    subject: row.subject,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TICKETS_LIST_CAP = 200;

export async function listSupportTickets({ status, priority, q }) {
  const { rows } = await pool.query(
    `SELECT t.*, u.full_name AS user_name
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     WHERE ($1::text IS NULL OR t.status = $1)
       AND ($2::text IS NULL OR t.priority = $2)
       AND ($3::text IS NULL OR t.subject ILIKE '%' || $3 || '%' OR u.full_name ILIKE '%' || $3 || '%')
     ORDER BY t.created_at DESC
     LIMIT ${TICKETS_LIST_CAP}`,
    [status || null, priority || null, q || null]
  );
  return rows.map(toTicketSummary);
}

export async function findSupportTicketById(id) {
  const { rows } = await pool.query(
    `SELECT t.*, u.full_name AS user_name
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

// ---- Announcements + Policies (Round D) ----

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
    kind: row.kind,
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

export async function listAnnouncements({ status, audience }) {
  const { rows } = await pool.query(
    `SELECT * FROM content_items
     WHERE kind = 'announcement'
       AND ($1::text IS NULL OR status = $1)
       AND ($2::text IS NULL OR audience = $2)
     ORDER BY created_at DESC`,
    [status || null, audience || null]
  );
  return rows.map(toContentItem);
}

export async function findAnnouncementById(id) {
  const { rows } = await pool.query(
    "SELECT * FROM content_items WHERE id = $1 AND kind = 'announcement'",
    [id]
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

// Public-facing (Home promo banner) - the single latest live announcement
// for a given audience, computing "live" directly in SQL (published, and
// within any schedule window) rather than fetching every published row and
// filtering in JS. audience 'all' announcements show to every audience.
export async function findLatestActiveAnnouncement(audience) {
  const { rows } = await pool.query(
    `SELECT * FROM content_items
     WHERE kind = 'announcement'
       AND status = 'published'
       AND audience IN ($1, 'all')
       AND (scheduled_at IS NULL OR scheduled_at <= now())
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC
     LIMIT 1`,
    [audience]
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

export async function createAnnouncement({ title, body, audience, scheduledAt, expiresAt, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO content_items (kind, title, body, audience, scheduled_at, expires_at, created_by)
     VALUES ('announcement', $1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, body, audience, scheduledAt ?? null, expiresAt ?? null, createdBy]
  );
  return toContentItem(rows[0]);
}

export async function updateAnnouncement(id, { title, body, audience, scheduledAt, expiresAt }) {
  const { rows } = await pool.query(
    `UPDATE content_items
     SET title = $2, body = $3, audience = $4, scheduled_at = $5, expires_at = $6, updated_at = now()
     WHERE id = $1 AND kind = 'announcement'
     RETURNING *`,
    [id, title, body, audience, scheduledAt ?? null, expiresAt ?? null]
  );
  return rows[0] ? toContentItem(rows[0]) : null;
}

// User ids to notify when an announcement is published - 'all' means every
// customer/worker (never admins, who don't need marketing/product
// announcements), 'customers'/'workers' map straight to that role.
export async function listUserIdsForAudience(audience) {
  const roles = audience === 'all' ? ['customer', 'worker'] : [audience === 'customers' ? 'customer' : 'worker'];
  const { rows } = await pool.query('SELECT id FROM users WHERE role = ANY($1::text[])', [roles]);
  return rows.map((r) => r.id);
}

export async function setAnnouncementStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE content_items
     SET status = $2,
         published_at = CASE WHEN $3 THEN now() ELSE published_at END,
         updated_at = now()
     WHERE id = $1 AND kind = 'announcement'
     RETURNING *`,
    [id, status, status === 'published']
  );
  return rows[0] ? toContentItem(rows[0]) : null;
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
