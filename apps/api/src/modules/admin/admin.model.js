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
