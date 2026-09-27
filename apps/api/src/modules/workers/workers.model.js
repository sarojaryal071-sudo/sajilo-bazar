import { pool } from '../../db/pool.js';

function toProfile(row) {
  return {
    userId: row.user_id,
    bio: row.bio,
    description: row.description,
    isOnline: row.is_online,
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg),
    jobsCompletedCount: row.jobs_completed_count,
    latitude: row.latitude,
    longitude: row.longitude,
    serviceAreaLabel: row.service_area_label,
    district: row.district,
    handle: row.handle,
    welcomedAt: row.welcomed_at,
    // Self-reported only, not computed - "usually replies within Xh" on
    // the worker's profile.
    typicalResponseHours: row.typical_response_hours,
  };
}

function toAvailabilityBlock(row) {
  return { id: row.id, dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5) };
}

function toWorkerService(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    category: row.category,
    highRisk: row.high_risk,
    price: Number(row.price),
    isActive: row.is_active,
    approvalStatus: row.approval_status,
    reviewComment: row.review_comment,
  };
}

// No fileUrl on this shape, deliberately - the raw Cloudinary URL never
// reaches a client (worker's own GET /workers/me and the admin's GET
// /admin/users/:id both go through this same serializer). Viewing a
// document goes through GET /admin/documents/:id/file instead, which
// looks the row's file_url up server-side and streams it after checking
// the requester is an authenticated admin.
function toDocument(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    docType: row.doc_type,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewComment: row.review_comment,
    workerServiceId: row.worker_service_id,
    createdAt: row.created_at,
  };
}

function toService(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    highRisk: row.high_risk,
  };
}

function toPortfolioItem(row) {
  return {
    id: row.id,
    workerId: row.worker_id,
    title: row.title,
    description: row.description,
    imageUrls: row.image_urls ?? [],
    link: row.link,
    category: row.category,
    // pg returns a DATE column as a JS Date (UTC midnight) - normalize to a
    // plain YYYY-MM-DD string so this round-trips safely through JSON
    // without a timezone-shift surprise, since this is purely informational
    // (never used in date arithmetic).
    workDate: row.work_date instanceof Date ? row.work_date.toISOString().slice(0, 10) : row.work_date,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export async function updateDescription(userId, description) {
  const { rows } = await pool.query(
    'UPDATE worker_profiles SET description = $1, updated_at = now() WHERE user_id = $2 RETURNING *',
    [description, userId]
  );
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function setVerificationStatus(userId, status) {
  await pool.query(
    'UPDATE worker_profiles SET verification_status = $1, updated_at = now() WHERE user_id = $2',
    [status, userId]
  );
}

// The worker's earliest-added service decides their "profession" for
// handle purposes - most workers apply with services in a single category,
// and this is stable even if they add unrelated categories later.
async function findFirstServiceCategory(workerId) {
  const { rows } = await pool.query(
    `SELECT s.category FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1
     ORDER BY ws.id ASC
     LIMIT 1`,
    [workerId]
  );
  return rows[0]?.category ?? null;
}

// Auto-generated short handle ("PL042") assigned once, the first time a
// worker is approved - idempotent (a worker who is rejected and later
// re-approved keeps their original handle). The prefix is just the
// category's first two letters uppercased, so it works for any category
// without a hardcoded map; the number is how many workers already hold
// that prefix, so it reads as "the Nth approved <profession>".
export async function assignHandle(workerId) {
  const { rows: existing } = await pool.query(
    'SELECT handle FROM worker_profiles WHERE user_id = $1',
    [workerId]
  );
  if (existing[0]?.handle) return existing[0].handle;

  const category = await findFirstServiceCategory(workerId);
  const prefix = (category || 'WK').slice(0, 2).toUpperCase();

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM worker_profiles WHERE handle LIKE $1',
    [`${prefix}%`]
  );
  const handle = `${prefix}${String(countRows[0].count + 1).padStart(3, '0')}`;

  const { rows } = await pool.query(
    'UPDATE worker_profiles SET handle = $2 WHERE user_id = $1 AND handle IS NULL RETURNING handle',
    [workerId, handle]
  );
  return rows[0]?.handle ?? (await findProfile(workerId))?.handle ?? null;
}

// One-time post-approval welcome - idempotent, only ever sets welcomed_at
// once (later calls are a no-op since the WHERE clause no longer matches).
export async function ackWelcome(userId) {
  const { rows } = await pool.query(
    'UPDATE worker_profiles SET welcomed_at = now() WHERE user_id = $1 AND welcomed_at IS NULL RETURNING *',
    [userId]
  );
  if (rows[0]) return toProfile(rows[0]);
  return findProfile(userId);
}

// Going online records wherever the worker's browser says they are right
// now - instant-request matching needs a real coordinate, not the free-text
// service_area_label. Going offline leaves the last known location in
// place (harmless - they won't be matched again until back online).
// online_overridden_at is stamped here (this is always the explicit manual
// toggle - see workers.routes.js) so the availability schedule knows a
// manual override is in effect until the next block boundary after this
// moment (see apps/api/src/lib/availability.js).
export async function setOnline(userId, { isOnline, latitude, longitude }) {
  const { rows } = await pool.query(
    `UPDATE worker_profiles
     SET is_online = $2,
         online_overridden_at = now(),
         latitude = CASE WHEN $2 THEN COALESCE($3, latitude) ELSE latitude END,
         longitude = CASE WHEN $2 THEN COALESCE($4, longitude) ELSE longitude END,
         updated_at = now()
     WHERE user_id = $1
     RETURNING *`,
    [userId, isOnline, latitude ?? null, longitude ?? null]
  );
  return rows[0] ? toProfile(rows[0]) : null;
}

// The schedule-driven sync path (workers.service.js syncEffectiveOnline) -
// deliberately does NOT touch online_overridden_at, since this isn't a new
// manual action, just the computed status catching up to the schedule.
export async function setIsOnlineFromSchedule(userId, isOnline) {
  await pool.query('UPDATE worker_profiles SET is_online = $2, updated_at = now() WHERE user_id = $1', [
    userId,
    isOnline,
  ]);
}

export async function setTypicalResponseHours(userId, hours) {
  const { rows } = await pool.query(
    'UPDATE worker_profiles SET typical_response_hours = $2, updated_at = now() WHERE user_id = $1 RETURNING *',
    [userId, hours]
  );
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function findOnlineOverriddenAt(workerId) {
  const { rows } = await pool.query('SELECT online_overridden_at FROM worker_profiles WHERE user_id = $1', [
    workerId,
  ]);
  return rows[0]?.online_overridden_at ?? null;
}

export async function listAvailability(workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM worker_availability_blocks WHERE worker_id = $1 ORDER BY day_of_week, start_time',
    [workerId]
  );
  return rows.map(toAvailabilityBlock);
}

// Replace-all, same pattern as replaceWorkerServices - the worker's full
// weekly schedule is always submitted and saved as one set, not
// incrementally patched.
export async function replaceAvailability(workerId, blocks) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM worker_availability_blocks WHERE worker_id = $1', [workerId]);
    for (const { dayOfWeek, startTime, endTime } of blocks) {
      await client.query(
        'INSERT INTO worker_availability_blocks (worker_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [workerId, dayOfWeek, startTime, endTime]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return listAvailability(workerId);
}

// Every approved worker who has at least one availability block set - the
// full set syncEffectiveOnline is run over right before instant-request
// matching (see bookings.service.js), so matching always sees each
// scheduled worker's current computed status rather than whatever was
// stored as of their last touchpoint.
export async function listWorkersWithAvailability() {
  const { rows } = await pool.query(
    `SELECT DISTINCT wp.user_id, wp.is_online, wp.online_overridden_at
     FROM worker_profiles wp
     JOIN worker_availability_blocks b ON b.worker_id = wp.user_id
     WHERE wp.verification_status = 'approved'`
  );
  return rows.map((r) => ({ userId: r.user_id, isOnline: r.is_online, onlineOverriddenAt: r.online_overridden_at }));
}

export async function listServiceCatalog() {
  const { rows } = await pool.query(
    'SELECT * FROM services WHERE is_active = true ORDER BY category, name'
  );
  return rows.map(toService);
}

// Every service, including inactive ones - the onboarding pricing step
// (Step 2c) needs the full catalog for whatever category the worker just
// picked, not just what's currently active, so a service temporarily
// deactivated mid-review still displays sanely if already chosen. Kept
// separate from listServiceCatalog (search/detail's public catalog) so
// that one's is_active filter stays untouched.
export async function listServicesByCategory(category) {
  const { rows } = await pool.query(
    'SELECT * FROM services WHERE category = $1 ORDER BY name',
    [category]
  );
  return rows.map(toService);
}

export async function listAllCategories() {
  const { rows } = await pool.query(
    'SELECT DISTINCT category FROM services WHERE is_active = true ORDER BY category'
  );
  return rows.map((r) => r.category);
}

// approvalStatus defaults to the table's own 'approved' default when not
// given (existing call sites) - the onboarding pricing step (Step 2c)
// passes it explicitly per service, 'pending' when that service's price
// falls outside its admin-set band, so it lands in the same document-
// review queue a cross-category addService() request already uses.
export async function replaceWorkerServices(client, workerId, services) {
  await client.query('DELETE FROM worker_services WHERE worker_id = $1', [workerId]);
  for (const { serviceId, price, approvalStatus } of services) {
    if (approvalStatus) {
      await client.query(
        'INSERT INTO worker_services (worker_id, service_id, price, approval_status) VALUES ($1, $2, $3, $4)',
        [workerId, serviceId, price, approvalStatus]
      );
    } else {
      await client.query(
        'INSERT INTO worker_services (worker_id, service_id, price) VALUES ($1, $2, $3)',
        [workerId, serviceId, price]
      );
    }
  }
}

export async function setDistrict(userId, district) {
  const { rows } = await pool.query(
    'UPDATE worker_profiles SET district = $1, updated_at = now() WHERE user_id = $2 RETURNING *',
    [district, userId]
  );
  return rows[0] ? toProfile(rows[0]) : null;
}

// Only districts an admin has actually launched - a district row can exist
// ahead of time (seeded for a future launch) without being selectable yet.
export async function listDistricts() {
  const { rows } = await pool.query(
    'SELECT id, name FROM districts WHERE is_active = true ORDER BY name'
  );
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

// Whether ANY of a worker's currently-chosen services belongs to a
// high_risk category - the basis for requiring a skill_certificate at
// Step 3 (a safe superset of the current all-electrical-flagged
// convention: a worker with even one high_risk service must provide it).
// Deliberately not restricted to approval_status='approved' - a
// still-pending price-flagged service still counts, since the requirement
// is about the category, not whether admin has reviewed the price yet.
export async function hasHighRiskService(workerId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 AND s.high_risk = true AND ws.is_active = true
     LIMIT 1`,
    [workerId]
  );
  return rows.length > 0;
}

// The worker's own view shows every active service regardless of approval
// status (including pending ones), so they can see what's awaiting review -
// only the public-facing queries (search, worker detail, booking) filter
// down to approved.
export async function listWorkerServices(workerId) {
  const { rows } = await pool.query(
    `SELECT ws.*, s.name AS service_name, s.category, s.high_risk
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
// Re-adding a previously-rejected service (the "retry" flow) also resets
// approval_status/reviewed_by/reviewed_at/review_comment, since a retry
// submission is a fresh request, not a continuation of the rejected one.
// Accepts an optional client so it can participate in the transaction
// addService() uses when a supporting document is uploaded alongside it.
export async function addWorkerService(workerId, { serviceId, price, approvalStatus }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO worker_services (worker_id, service_id, price, approval_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (worker_id, service_id)
     DO UPDATE SET price = EXCLUDED.price, is_active = true, approval_status = EXCLUDED.approval_status,
                   reviewed_by = NULL, reviewed_at = NULL, review_comment = NULL
     RETURNING *`,
    [workerId, serviceId, price, approvalStatus]
  );
  const { rows: joined } = await client.query(
    `SELECT ws.*, s.name AS service_name, s.category, s.high_risk
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id
     WHERE ws.id = $1`,
    [rows[0].id]
  );
  return toWorkerService(joined[0]);
}

// Deactivated services aren't a valid choice for a worker's own "add a
// service" flow - returning null here makes addService() 404 the same way
// it does for a nonexistent id.
export async function findServiceById(serviceId) {
  const { rows } = await pool.query(
    'SELECT * FROM services WHERE id = $1 AND is_active = true',
    [serviceId]
  );
  return rows[0] ? toService(rows[0]) : null;
}

export async function insertDocument(client, { workerId, docType, fileUrl, workerServiceId = null }) {
  const { rows } = await client.query(
    `INSERT INTO verification_documents (worker_id, doc_type, file_url, worker_service_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [workerId, docType, fileUrl, workerServiceId]
  );
  return toDocument(rows[0]);
}

// Identity-verification documents only (worker-apply flow) - a document
// submitted as evidence for a specific cross-category service request is
// excluded here and shown on that service's own row instead (see
// WorkerDashboard.jsx), so this stays a clean history of the original
// verification, not mixed with per-service evidence.
export async function listDocuments(workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM verification_documents WHERE worker_id = $1 AND worker_service_id IS NULL ORDER BY created_at DESC',
    [workerId]
  );
  return rows.map(toDocument);
}

// A worker only ever has one current identity-verification row per doc
// type (apply() inserts each type once; resubmitDocument below updates
// that same row in place rather than inserting a new one) - raw row, not
// toDocument(), since the service layer needs to check its status before
// deciding whether a resubmission is even allowed.
export async function findDocumentByTypeForWorker(workerId, docType) {
  const { rows } = await pool.query(
    'SELECT * FROM verification_documents WHERE worker_id = $1 AND doc_type = $2 AND worker_service_id IS NULL',
    [workerId, docType]
  );
  return rows[0] || null;
}

// Resubmitting a rejected document updates that same row in place (new
// file, back to 'pending', review fields cleared) rather than inserting a
// new one - it's a correction to the same submission, not a fresh one.
// Only matches a currently-'rejected' row, so this can't be used to
// silently reopen an already-approved or already-pending document.
export async function resubmitDocument(id, fileUrl) {
  const { rows } = await pool.query(
    `UPDATE verification_documents
     SET file_url = $2, status = 'pending', reviewed_by = NULL, reviewed_at = NULL, review_comment = NULL
     WHERE id = $1 AND status = 'rejected'
     RETURNING *`,
    [id, fileUrl]
  );
  return rows[0] ? toDocument(rows[0]) : null;
}

// ---- Portfolio (richer worker profile, 2026-09-27) ----

export async function listPortfolioItems(workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM worker_portfolio_items WHERE worker_id = $1 ORDER BY display_order, id',
    [workerId]
  );
  return rows.map(toPortfolioItem);
}

export async function findPortfolioItem(id, workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM worker_portfolio_items WHERE id = $1 AND worker_id = $2',
    [id, workerId]
  );
  return rows[0] ? toPortfolioItem(rows[0]) : null;
}

// New items go to the end of the list - display_order is the current max + 1.
export async function createPortfolioItem(workerId, { title, description, imageUrls, link, category, workDate }) {
  const { rows } = await pool.query(
    `INSERT INTO worker_portfolio_items (worker_id, title, description, image_urls, link, category, work_date, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             (SELECT COALESCE(MAX(display_order), -1) + 1 FROM worker_portfolio_items WHERE worker_id = $1))
     RETURNING *`,
    [workerId, title, description ?? null, JSON.stringify(imageUrls ?? []), link ?? null, category, workDate ?? null]
  );
  return toPortfolioItem(rows[0]);
}

export async function updatePortfolioItem(id, workerId, { title, description, imageUrls, link, category, workDate }) {
  const { rows } = await pool.query(
    `UPDATE worker_portfolio_items
     SET title = $3, description = $4, image_urls = $5, link = $6, category = $7, work_date = $8, updated_at = now()
     WHERE id = $1 AND worker_id = $2
     RETURNING *`,
    [id, workerId, title, description ?? null, JSON.stringify(imageUrls ?? []), link ?? null, category, workDate ?? null]
  );
  return rows[0] ? toPortfolioItem(rows[0]) : null;
}

export async function deletePortfolioItem(id, workerId) {
  const { rows } = await pool.query(
    'DELETE FROM worker_portfolio_items WHERE id = $1 AND worker_id = $2 RETURNING id',
    [id, workerId]
  );
  return Boolean(rows[0]);
}

// Replace-all reorder, same idiom as replaceAvailability/replaceWorkerServices -
// the full desired order always arrives as one set (orderedIds' own index
// becomes display_order), not an incremental patch.
export async function reorderPortfolioItems(workerId, orderedIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE worker_portfolio_items SET display_order = $3, updated_at = now() WHERE id = $1 AND worker_id = $2',
        [orderedIds[i], workerId, i]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return listPortfolioItems(workerId);
}

function toSearchResult(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    handle: row.handle,
    profileImageUrl: row.profile_image_url,
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg),
    jobsCompletedCount: row.jobs_completed_count,
    serviceAreaLabel: row.service_area_label,
    // Raw score, not the tier - workers.service.js maps this to trustTier
    // and strips it before the response ever reaches a customer. Never
    // selects the worker's phone here or anywhere else public-facing (see
    // the phone-scoping spec) - only the booking detail endpoint, once
    // accepted, ever includes it.
    trustScore: row.trust_score === null ? null : Number(row.trust_score),
    typicalResponseHours: row.typical_response_hours,
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
//
// district (worker signup round, Part B): filters by district match FIRST,
// same as instant-broadcast matching (see bookings.model.js
// findNearbyOnlineWorkers). Optional and additive to the pre-existing
// filters above, not a new radius behavior - null skips it entirely, so a
// customer with no resolvable district (no saved/default address yet)
// still sees the same unfiltered results this endpoint always returned.
export async function searchWorkers({ category, serviceId, q, district }) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (u.id)
         u.id AS user_id, u.full_name, wp.handle, u.profile_image_url, wp.verification_status,
         wp.rating_avg, wp.jobs_completed_count, wp.service_area_label, wp.trust_score, wp.typical_response_hours,
         ws.service_id, s.name AS service_name, s.category, ws.price
       FROM users u
       JOIN worker_profiles wp ON wp.user_id = u.id
       JOIN worker_services ws ON ws.worker_id = u.id AND ws.is_active = true AND ws.approval_status = 'approved'
       JOIN services s ON s.id = ws.service_id AND s.is_active = true
       WHERE wp.verification_status = 'approved'
         AND u.deactivated_at IS NULL AND u.deleted_at IS NULL
         AND ($1::text IS NULL OR s.category = $1)
         AND ($2::int IS NULL OR s.id = $2)
         AND (
           $3::text IS NULL
           OR u.full_name ILIKE '%' || $3 || '%'
           OR s.name ILIKE '%' || $3 || '%'
           OR wp.service_area_label ILIKE '%' || $3 || '%'
         )
         AND ($4::text IS NULL OR wp.district = $4)
       ORDER BY u.id, ws.price ASC
     ) matched
     ORDER BY matched.rating_avg DESC
     LIMIT 20`,
    [category ?? null, serviceId ?? null, q ?? null, district ?? null]
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

function toWorkerDetail(profileRow, serviceRows, { reviewsCount, reviews }, portfolioItems) {
  return {
    userId: profileRow.user_id,
    fullName: profileRow.full_name,
    handle: profileRow.handle,
    profileImageUrl: profileRow.profile_image_url,
    verificationStatus: profileRow.verification_status,
    bio: profileRow.bio,
    description: profileRow.description,
    portfolioItems: portfolioItems ?? [],
    ratingAvg: Number(profileRow.rating_avg),
    jobsCompletedCount: profileRow.jobs_completed_count,
    serviceAreaLabel: profileRow.service_area_label,
    // Raw score - see toSearchResult above, same reasoning (stripped down
    // to trustTier by workers.service.js before this reaches a customer).
    trustScore: profileRow.trust_score === null ? null : Number(profileRow.trust_score),
    typicalResponseHours: profileRow.typical_response_hours,
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
    `SELECT u.id AS user_id, u.full_name, wp.handle, u.profile_image_url, wp.verification_status,
            wp.bio, wp.description, wp.rating_avg, wp.jobs_completed_count, wp.service_area_label,
            wp.trust_score, wp.typical_response_hours
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.id = $1 AND wp.verification_status = 'approved'
       AND u.deactivated_at IS NULL AND u.deleted_at IS NULL`,
    [userId]
  );
  if (!rows[0]) return null;

  const services = await pool.query(
    `SELECT ws.service_id, ws.price, s.name AS service_name, s.category
     FROM worker_services ws
     JOIN services s ON s.id = ws.service_id AND s.is_active = true
     WHERE ws.worker_id = $1 AND ws.is_active = true AND ws.approval_status = 'approved'
     ORDER BY s.category, s.name`,
    [userId]
  );

  const reviewData = await findReviewsForWorker(userId);
  const portfolioItems = await listPortfolioItems(userId);

  return toWorkerDetail(rows[0], services.rows, reviewData, portfolioItems);
}

// ---- Home featured rows (2026-09-27) ----

const FEATURED_SAMPLE_SIZE = 6;

function toFeaturedWorker(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    handle: row.handle,
    profileImageUrl: row.profile_image_url,
    category: row.category,
    // Raw score - see toSearchResult above, same reasoning (workers.service.js
    // strips this down to trustTier before it reaches a customer).
    trustScore: row.trust_score === null ? null : Number(row.trust_score),
  };
}

// One worker's earliest-approved-and-active service category, for the
// featured card's subtitle - same join shape searchWorkers already uses,
// just without picking a specific service/price.
const FEATURED_CATEGORY_JOIN = `
  LEFT JOIN LATERAL (
    SELECT s.category FROM worker_services ws
    JOIN services s ON s.id = ws.service_id AND s.is_active = true
    WHERE ws.worker_id = u.id AND ws.is_active = true AND ws.approval_status = 'approved'
    ORDER BY ws.id ASC LIMIT 1
  ) sc ON true
`;

// Random up-to-6 sample of approved "Highly Trusted" (trust_score >= 80)
// workers - Home's "Top Rated Workers" row. Plain ORDER BY RANDOM() per
// spec (no weighting needed) - the client re-polls this every 30s so every
// eligible worker gets fair rotation over time rather than caching/ranking
// a fixed top-N here.
export async function listFeaturedTopRated() {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, wp.handle, u.profile_image_url, wp.trust_score, sc.category
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     ${FEATURED_CATEGORY_JOIN}
     WHERE wp.verification_status = 'approved'
       AND u.deactivated_at IS NULL AND u.deleted_at IS NULL
       AND wp.trust_score >= 80
     ORDER BY RANDOM()
     LIMIT ${FEATURED_SAMPLE_SIZE}`
  );
  return rows.map(toFeaturedWorker);
}

// Random up-to-6 sample of approved workers within their first 30 days
// (the same window as the trust-score grace period - see
// trustScore.service.js GRACE_PERIOD_DAYS) with zero at-fault disputes ever
// recorded against them - Home's "New to Sajilo Bazar" row. Naturally
// disjoint from the Top Rated pool: a worker still in the grace period
// always has trust_score IS NULL, never >= 80.
export async function listFeaturedNewWorkers() {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, wp.handle, u.profile_image_url, wp.trust_score, sc.category
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     ${FEATURED_CATEGORY_JOIN}
     WHERE wp.verification_status = 'approved'
       AND u.deactivated_at IS NULL AND u.deleted_at IS NULL
       AND wp.approved_at >= now() - INTERVAL '30 days'
       AND NOT EXISTS (
         SELECT 1 FROM disputes d
         JOIN bookings b ON b.id = d.booking_id
         WHERE b.worker_id = u.id AND d.at_fault = 'worker'
       )
     ORDER BY RANDOM()
     LIMIT ${FEATURED_SAMPLE_SIZE}`
  );
  return rows.map(toFeaturedWorker);
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
