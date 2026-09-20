import { pool } from '../../db/pool.js';

function toProfile(row) {
  return {
    userId: row.user_id,
    bio: row.bio,
    isOnline: row.is_online,
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg),
    jobsCompletedCount: row.jobs_completed_count,
    latitude: row.latitude,
    longitude: row.longitude,
    serviceAreaLabel: row.service_area_label,
  };
}

function toWorkerService(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    price: Number(row.price),
    isActive: row.is_active,
  };
}

function toDocument(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    docType: row.doc_type,
    fileUrl: row.file_url,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function toService(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
  };
}

export async function findProfile(userId) {
  const { rows } = await pool.query('SELECT * FROM worker_profiles WHERE user_id = $1', [userId]);
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateBio(userId, bio) {
  await pool.query('UPDATE worker_profiles SET bio = $1, updated_at = now() WHERE user_id = $2', [
    bio,
    userId,
  ]);
}

export async function setVerificationStatus(userId, status) {
  await pool.query(
    'UPDATE worker_profiles SET verification_status = $1, updated_at = now() WHERE user_id = $2',
    [status, userId]
  );
}

export async function listServiceCatalog() {
  const { rows } = await pool.query('SELECT * FROM services ORDER BY category, name');
  return rows.map(toService);
}

export async function replaceWorkerServices(client, workerId, services) {
  await client.query('DELETE FROM worker_services WHERE worker_id = $1', [workerId]);
  for (const { serviceId, price } of services) {
    await client.query(
      'INSERT INTO worker_services (worker_id, service_id, price) VALUES ($1, $2, $3)',
      [workerId, serviceId, price]
    );
  }
}

export async function listWorkerServices(workerId) {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 AND ws.is_active = true`,
    [workerId]
  );
  return rows.map(toWorkerService);
}

export async function insertDocument(client, { workerId, docType, fileUrl }) {
  const { rows } = await client.query(
    `INSERT INTO verification_documents (worker_id, doc_type, file_url)
     VALUES ($1, $2, $3) RETURNING *`,
    [workerId, docType, fileUrl]
  );
  return toDocument(rows[0]);
}

export async function listDocuments(workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM verification_documents WHERE worker_id = $1 ORDER BY created_at DESC',
    [workerId]
  );
  return rows.map(toDocument);
}

export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
