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
    category: row.category,
    price: Number(row.price),
    isActive: row.is_active,
    approvalStatus: row.approval_status,
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

// Going online records wherever the worker's browser says they are right
// now - instant-request matching needs a real coordinate, not the free-text
// service_area_label. Going offline leaves the last known location in
// place (harmless - they won't be matched again until back online).
export async function setOnline(userId, { isOnline, latitude, longitude }) {
  const { rows } = await pool.query(
    `UPDATE worker_profiles
     SET is_online = $2,
         latitude = CASE WHEN $2 THEN COALESCE($3, latitude) ELSE latitude END,
         longitude = CASE WHEN $2 THEN COALESCE($4, longitude) ELSE longitude END,
         updated_at = now()
     WHERE user_id = $1
     RETURNING *`,
    [userId, isOnline, latitude ?? null, longitude ?? null]
  );
  return rows[0] ? toProfile(rows[0]) : null;
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

// The worker's own view shows every active service regardless of approval
// status (including pending ones), so they can see what's awaiting review -
// only the public-facing queries (search, worker detail, booking) filter
// down to approved.
export async function listWorkerServices(workerId) {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 AND ws.is_active = true`,
    [workerId]
  );
  return rows.map(toWorkerService);
}

// Distinct categories among a worker's already-approved services - the
// basis for deciding whether a newly added service goes live immediately
// (same category as something already vetted) or needs admin review.
export async function findApprovedCategories(workerId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT s.category
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 AND ws.approval_status = 'approved'`,
    [workerId]
  );
  return rows.map((row) => row.category);
}

// Adding a service is idempotent on (worker_id, service_id) - re-adding one
// already on the worker's list just updates its price rather than erroring,
// matching how replaceWorkerServices already treats the apply-time set.
export async function addWorkerService(workerId, { serviceId, price, approvalStatus }) {
  const { rows } = await pool.query(
    `INSERT INTO worker_services (worker_id, service_id, price, approval_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (worker_id, service_id)
     DO UPDATE SET price = EXCLUDED.price, is_active = true
     RETURNING *`,
    [workerId, serviceId, price, approvalStatus]
  );
  const { rows: joined } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.id = $1`,
    [rows[0].id]
  );
  return toWorkerService(joined[0]);
}

export async function findServiceById(serviceId) {
  const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  return rows[0] ? toService(rows[0]) : null;
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

function toSearchResult(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    profileImageUrl: row.profile_image_url,
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg),
    jobsCompletedCount: row.jobs_completed_count,
    serviceAreaLabel: row.service_area_label,
    matchedService: {
      id: row.service_id,
      name: row.service_name,
      category: row.category,
      price: Number(row.price),
    },
  };
}

// One row per worker - their cheapest service matching the filters, via
// DISTINCT ON. Simple filtering only (category / exact service / a text
// match against worker name, service name, or service area) - no radius/
// geolocation math, that's Phase 3's instant-request work. Only approved
// workers are searchable. Final results are sorted best-rated first and
// capped at 20, so a call with no filters at all doubles as "recommended/
// top-rated workers" for Home's search-activation moment.
export async function searchWorkers({ category, serviceId, q }) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (u.id)
         u.id AS user_id, u.full_name, u.profile_image_url, wp.verification_status,
         wp.rating_avg, wp.jobs_completed_count, wp.service_area_label,
         ws.service_id, s.name AS service_name, s.category, ws.price
       FROM users u
       JOIN worker_profiles wp ON wp.user_id = u.id
       JOIN worker_services ws ON ws.worker_id = u.id AND ws.is_active = true AND ws.approval_status = 'approved'
       JOIN services s ON s.id = ws.service_id
       WHERE wp.verification_status = 'approved'
         AND ($1::text IS NULL OR s.category = $1)
         AND ($2::int IS NULL OR s.id = $2)
         AND (
           $3::text IS NULL
           OR u.full_name ILIKE '%' || $3 || '%'
           OR s.name ILIKE '%' || $3 || '%'
           OR wp.service_area_label ILIKE '%' || $3 || '%'
         )
       ORDER BY u.id, ws.price ASC
     ) matched
     ORDER BY matched.rating_avg DESC
     LIMIT 20`,
    [category ?? null, serviceId ?? null, q ?? null]
  );
  return rows.map(toSearchResult);
}

// Cap on how many reviews the detail endpoint returns - not real pagination,
// just a defensive ceiling. The frontend shows a handful with a "see all"
// expand over whatever comes back here.
const MAX_REVIEWS_RETURNED = 50;

// Shared by the public worker-detail view and a worker's own profile/dashboard,
// so a worker sees the same review list a customer would see on their profile.
// COUNT(*) OVER() runs over every matching row before LIMIT clips the result,
// so it's the true total review count in the same round trip - no separate
// count query needed.
export async function findReviewsForWorker(workerId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, cu.full_name AS customer_name,
            COUNT(*) OVER() AS total_count
     FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     JOIN users cu ON cu.id = b.customer_id
     WHERE b.worker_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [workerId, MAX_REVIEWS_RETURNED]
  );
  return {
    reviewsCount: rows[0] ? Number(rows[0].total_count) : 0,
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      customerName: row.customer_name,
    })),
  };
}

function toWorkerDetail(profileRow, serviceRows, { reviewsCount, reviews }) {
  return {
    userId: profileRow.user_id,
    fullName: profileRow.full_name,
    profileImageUrl: profileRow.profile_image_url,
    verificationStatus: profileRow.verification_status,
    bio: profileRow.bio,
    ratingAvg: Number(profileRow.rating_avg),
    jobsCompletedCount: profileRow.jobs_completed_count,
    serviceAreaLabel: profileRow.service_area_label,
    services: serviceRows.map((row) => ({
      id: row.service_id,
      name: row.service_name,
      category: row.category,
      price: Number(row.price),
    })),
    reviewsCount,
    reviews,
  };
}

// Public detail view - only for approved workers, same rule as search, so
// a customer can't view an unverified worker's profile by guessing an id.
export async function findApprovedWorkerDetail(userId) {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, u.profile_image_url, wp.verification_status,
            wp.bio, wp.rating_avg, wp.jobs_completed_count, wp.service_area_label
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.id = $1 AND wp.verification_status = 'approved'`,
    [userId]
  );
  if (!rows[0]) return null;

  const services = await pool.query(
    `SELECT ws.service_id, ws.price, s.name AS service_name, s.category
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 AND ws.is_active = true AND ws.approval_status = 'approved'
     ORDER BY s.category, s.name`,
    [userId]
  );

  const reviewData = await findReviewsForWorker(userId);

  return toWorkerDetail(rows[0], services.rows, reviewData);
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
