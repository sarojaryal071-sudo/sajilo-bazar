import { pool } from '../../db/pool.js';

// Shared by auth.service.js (worker-facing create, public - a locked-out
// worker has no token to authenticate a request with) and admin.service.js
// (the review queue - approve/deny) rather than living in either module -
// same reasoning as verification_documents being created in workers.model.js
// but reviewed via admin.model.js, except here neither existing module
// naturally owns both halves, so this one is genuinely shared.
function toRequest(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    status: row.status,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    denialReason: row.denial_reason,
  };
}

function toQueueItem(row) {
  return {
    kind: 'password_reset_request',
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    profileImageUrl: row.profile_image_url,
    createdAt: row.requested_at,
  };
}

export async function findPendingByWorkerId(workerId) {
  const { rows } = await pool.query(
    "SELECT * FROM password_reset_requests WHERE worker_id = $1 AND status = 'pending'",
    [workerId]
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function create(workerId) {
  const { rows } = await pool.query(
    'INSERT INTO password_reset_requests (worker_id) VALUES ($1) RETURNING *',
    [workerId]
  );
  return toRequest(rows[0]);
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM password_reset_requests WHERE id = $1', [id]);
  return rows[0] ? toRequest(rows[0]) : null;
}

// Same merged-queue shape admin.model.js's listPendingWorkerVerifications
// produces (kind/workerId/workerName/profileImageUrl/createdAt) - lets
// admin.service.js's getApprovalsQueue concat a third array onto the two
// it already sorts together.
export async function listPending() {
  const { rows } = await pool.query(
    `SELECT prr.*, u.full_name AS worker_name, u.profile_image_url
     FROM password_reset_requests prr
     JOIN users u ON u.id = prr.worker_id
     WHERE prr.status = 'pending'
     ORDER BY prr.requested_at ASC`
  );
  return rows.map(toQueueItem);
}

export async function approve(id, adminId, newPasswordHash) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE password_reset_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = now()
       WHERE id = $2 RETURNING *`,
      [adminId, id]
    );
    const request = rows[0];
    await client.query(
      'UPDATE users SET password_hash = $1, must_change_password = true, updated_at = now() WHERE id = $2',
      [newPasswordHash, request.worker_id]
    );
    await client.query('COMMIT');
    return toRequest(request);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deny(id, adminId, reason) {
  const { rows } = await pool.query(
    `UPDATE password_reset_requests
     SET status = 'denied', reviewed_by = $1, reviewed_at = now(), denial_reason = $2
     WHERE id = $3 RETURNING *`,
    [adminId, reason ?? null, id]
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function clearMustChangePassword(userId) {
  await pool.query('UPDATE users SET must_change_password = false, updated_at = now() WHERE id = $1', [userId]);
}
