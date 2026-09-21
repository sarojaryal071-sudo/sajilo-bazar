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
    price: Number(row.price),
    createdAt: row.created_at,
  };
}

// The two independent approval queues from Phase 1 (identity/skill
// verification) and Phase 5 (cross-category service additions) - combined
// here into one chronological list since they're both "things an admin
// needs to say yes/no to", even though they update different tables.
export async function listPendingDocuments() {
  const { rows } = await pool.query(
    `SELECT vd.*, u.full_name AS worker_name
     FROM verification_documents vd
     JOIN users u ON u.id = vd.worker_id
     WHERE vd.status = 'pending'
     ORDER BY vd.created_at ASC`
  );
  return rows.map(toPendingDocument);
}

export async function listPendingServices() {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category, u.full_name AS worker_name
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

export async function decideDocument(id, { status, adminId }) {
  const { rows } = await pool.query(
    `UPDATE verification_documents
     SET status = $2, reviewed_by = $3, reviewed_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, status, adminId]
  );
  return rows[0] || null;
}

export async function setWorkerVerificationStatus(workerId, status) {
  await pool.query(
    'UPDATE worker_profiles SET verification_status = $1, updated_at = now() WHERE user_id = $2',
    [status, workerId]
  );
}

export async function findWorkerServiceById(id) {
  const { rows } = await pool.query('SELECT * FROM worker_services WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function decideWorkerService(id, { status, adminId }) {
  const { rows } = await pool.query(
    `UPDATE worker_services
     SET approval_status = $2, reviewed_by = $3, reviewed_at = now()
     WHERE id = $1 AND approval_status = 'pending'
     RETURNING *`,
    [id, status, adminId]
  );
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

export async function resolveDispute(id, { status, resolutionNotes, adminId }) {
  await pool.query(
    `UPDATE disputes
     SET status = $2, resolution_notes = $3, resolved_by = $4, resolved_at = now()
     WHERE id = $1`,
    [id, status, resolutionNotes ?? null, adminId]
  );
  return findDisputeById(id);
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
