import { pool } from '../../db/pool.js';

function toBooking(row) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    customerId: row.customer_id,
    workerId: row.worker_id,
    serviceId: row.service_id,
    price: row.price === null ? null : Number(row.price),
    addressLabel: row.address_label,
    latitude: row.latitude,
    longitude: row.longitude,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    serviceName: row.service_name,
    category: row.category,
    customerName: row.customer_name,
    customerImageUrl: row.customer_image_url,
    workerName: row.worker_name,
    workerImageUrl: row.worker_image_url,
  };
}

const SELECT_BOOKING = `
  SELECT b.*, s.name AS service_name, s.category,
    cu.full_name AS customer_name, cu.profile_image_url AS customer_image_url,
    wu.full_name AS worker_name, wu.profile_image_url AS worker_image_url
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN users cu ON cu.id = b.customer_id
  LEFT JOIN users wu ON wu.id = b.worker_id
`;

// Only a worker's currently active offering is bookable, and only once
// they're approved - same rule search/detail already enforce, so a customer
// can't book a worker they were never allowed to see.
export async function findActiveWorkerService(workerId, serviceId) {
  const { rows } = await pool.query(
    `SELECT ws.price FROM worker_services ws
     JOIN worker_profiles wp ON wp.user_id = ws.worker_id
     WHERE ws.worker_id = $1 AND ws.service_id = $2
       AND ws.is_active = true AND wp.verification_status = 'approved'`,
    [workerId, serviceId]
  );
  return rows[0] ? { price: Number(rows[0].price) } : null;
}

export async function create({ customerId, workerId, serviceId, price, addressLabel, latitude, longitude }) {
  const { rows } = await pool.query(
    `INSERT INTO bookings (customer_id, worker_id, service_id, price, address_label, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [customerId, workerId, serviceId, price, addressLabel, latitude ?? null, longitude ?? null]
  );
  return findById(rows[0].id);
}

// No worker yet - that's the whole point of the instant flow. price stays
// null until whoever claims it and completes the job confirms one.
export async function createInstant({ customerId, serviceId, addressLabel, latitude, longitude }) {
  const { rows } = await pool.query(
    `INSERT INTO bookings (type, customer_id, service_id, address_label, latitude, longitude)
     VALUES ('instant', $1, $2, $3, $4, $5) RETURNING id`,
    [customerId, serviceId, addressLabel, latitude, longitude]
  );
  return findById(rows[0].id);
}

// Plain Haversine in SQL (no PostGIS/earthdistance extension - keeps this
// working on any Postgres, including Neon, with no extra setup). Only
// online, approved workers with a saved location and this service active
// are candidates.
export async function findNearbyOnlineWorkers(serviceId, latitude, longitude, radiusKm) {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     JOIN worker_services ws ON ws.worker_id = u.id AND ws.is_active = true
     WHERE ws.service_id = $1
       AND wp.verification_status = 'approved'
       AND wp.is_online = true
       AND wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL
       AND 6371 * acos(LEAST(1, GREATEST(-1,
             cos(radians($2)) * cos(radians(wp.latitude)) * cos(radians(wp.longitude) - radians($3))
             + sin(radians($2)) * sin(radians(wp.latitude))
           ))) <= $4`,
    [serviceId, latitude, longitude, radiusKm]
  );
  return rows.map((r) => r.worker_id);
}

export async function createOffers(bookingId, workerIds) {
  if (workerIds.length === 0) return [];
  const values = workerIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO booking_offers (booking_id, worker_id) VALUES ${values}
     ON CONFLICT (booking_id, worker_id) DO NOTHING
     RETURNING *`,
    [bookingId, ...workerIds]
  );
  return rows.map((r) => ({ id: r.id, bookingId: r.booking_id, workerId: r.worker_id }));
}

// Atomic first-accept-wins: only succeeds if the booking is still an
// unclaimed instant request. Returns null if someone else already claimed
// it (or it's not a claimable booking at all).
export async function claimInstant(bookingId, workerId) {
  const { rows } = await pool.query(
    `UPDATE bookings SET worker_id = $2, status = 'accepted'
     WHERE id = $1 AND type = 'instant' AND status = 'requested' AND worker_id IS NULL
     RETURNING id`,
    [bookingId, workerId]
  );
  if (!rows[0]) return null;
  return findById(bookingId);
}

export async function markOfferAccepted(bookingId, workerId) {
  await pool.query(
    `UPDATE booking_offers SET status = 'accepted', responded_at = now()
     WHERE booking_id = $1 AND worker_id = $2`,
    [bookingId, workerId]
  );
}

// Returns the worker ids who had a pending offer on this booking (excluding
// the winner) so the caller can notify them their popup should close, then
// flips those offers to expired.
export async function expirePendingOffers(bookingId, exceptWorkerId) {
  const { rows } = await pool.query(
    `UPDATE booking_offers SET status = 'expired', responded_at = now()
     WHERE booking_id = $1 AND worker_id != $2 AND status = 'pending'
     RETURNING worker_id`,
    [bookingId, exceptWorkerId]
  );
  return rows.map((r) => r.worker_id);
}

export async function findOffer(bookingId, workerId) {
  const { rows } = await pool.query(
    'SELECT * FROM booking_offers WHERE booking_id = $1 AND worker_id = $2',
    [bookingId, workerId]
  );
  return rows[0]
    ? { id: rows[0].id, bookingId: rows[0].booking_id, workerId: rows[0].worker_id, status: rows[0].status }
    : null;
}

export async function declineOffer(bookingId, workerId) {
  const { rows } = await pool.query(
    `UPDATE booking_offers SET status = 'declined', responded_at = now()
     WHERE booking_id = $1 AND worker_id = $2 AND status = 'pending'
     RETURNING *`,
    [bookingId, workerId]
  );
  return rows[0] ?? null;
}

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BOOKING} WHERE b.id = $1`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

// role picks which side of the booking "belongs to" this user - a customer
// sees bookings they made, a worker sees bookings assigned to them.
export async function listForUser(userId, role, status) {
  const column = role === 'worker' ? 'b.worker_id' : 'b.customer_id';
  const { rows } = await pool.query(
    `${SELECT_BOOKING} WHERE ${column} = $1 AND ($2::text IS NULL OR b.status = $2)
     ORDER BY b.created_at DESC`,
    [userId, status ?? null]
  );
  return rows.map(toBooking);
}

export async function setAccepted(id) {
  await pool.query(`UPDATE bookings SET status = 'accepted' WHERE id = $1`, [id]);
  return findById(id);
}

export async function setDeclined(id) {
  await pool.query(`UPDATE bookings SET status = 'declined' WHERE id = $1`, [id]);
  return findById(id);
}

export async function setInProgress(id) {
  await pool.query(`UPDATE bookings SET status = 'in_progress' WHERE id = $1`, [id]);
  return findById(id);
}

// Completing a booking also credits the worker's completed-jobs count, so
// both writes happen in one transaction.
export async function setCompleted(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE bookings SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING worker_id`,
      [id]
    );
    if (rows[0]?.worker_id) {
      await client.query(
        'UPDATE worker_profiles SET jobs_completed_count = jobs_completed_count + 1 WHERE user_id = $1',
        [rows[0].worker_id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return findById(id);
}

export async function setCancelled(id, cancelledBy, reason) {
  await pool.query(
    `UPDATE bookings SET status = 'cancelled', cancelled_by = $2, cancel_reason = $3 WHERE id = $1`,
    [id, cancelledBy, reason ?? null]
  );
  return findById(id);
}
