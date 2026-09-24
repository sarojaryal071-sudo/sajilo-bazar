import { pool } from '../../db/pool.js';

// The worker's phone is only ever present in this one shape - included
// only while the booking is in an active, worker-accepted state (accepted
// or in_progress), and gone again the moment it's completed. Search and
// worker-detail (workers.model.js) never select it at all. See the
// phone-scoping spec.
const PHONE_VISIBLE_STATUSES = ['accepted', 'in_progress'];

function toBooking(row) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    customerId: row.customer_id,
    workerId: row.worker_id,
    price: row.price === null ? null : Number(row.price),
    addressLabel: row.address_label,
    latitude: row.latitude,
    longitude: row.longitude,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    initiatedBy: row.initiated_by,
    flagged: row.flagged,
    flagReason: row.flag_reason,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    customerName: row.customer_name,
    customerImageUrl: row.customer_image_url,
    workerName: row.worker_name,
    workerImageUrl: row.worker_image_url,
    workerHandle: row.worker_handle,
    workerPhone: row.worker_id && PHONE_VISIBLE_STATUSES.includes(row.status) ? row.worker_phone : null,
    services: [],
  };
}

const SELECT_BOOKING = `
  SELECT b.*,
    cu.full_name AS customer_name, cu.profile_image_url AS customer_image_url,
    wu.full_name AS worker_name, wu.profile_image_url AS worker_image_url, wu.phone AS worker_phone,
    wp.handle AS worker_handle
  FROM bookings b
  JOIN users cu ON cu.id = b.customer_id
  LEFT JOIN users wu ON wu.id = b.worker_id
  LEFT JOIN worker_profiles wp ON wp.user_id = b.worker_id
`;

// Batches the services lookup across every booking passed in, rather than
// one query per booking.
async function attachServices(bookings) {
  if (bookings.length === 0) return bookings;
  const { rows } = await pool.query(
    `SELECT bs.id, bs.booking_id, bs.service_id, bs.price, s.name, s.category
     FROM booking_services bs
     JOIN services s ON s.id = bs.service_id
     WHERE bs.booking_id = ANY($1::int[])
     ORDER BY bs.id`,
    [bookings.map((b) => b.id)]
  );
  const byBooking = new Map();
  for (const row of rows) {
    const list = byBooking.get(row.booking_id) ?? [];
    list.push({
      id: row.id,
      serviceId: row.service_id,
      name: row.name,
      category: row.category,
      price: row.price === null ? null : Number(row.price),
    });
    byBooking.set(row.booking_id, list);
  }
  return bookings.map((b) => ({ ...b, services: byBooking.get(b.id) ?? [] }));
}

// Only a worker's currently active offerings are bookable, and only once
// they're approved - both the worker overall (verification_status, same
// rule search/detail already enforce) and the specific service (its own
// approval_status - a pending cross-category addition isn't bookable until
// an admin reviews it). Returns just the requested ids that are actually
// available; the caller checks the count matches what was asked for.
export async function findActiveWorkerServices(workerId, serviceIds) {
  const { rows } = await pool.query(
    `SELECT ws.service_id, ws.price FROM worker_services ws
     JOIN worker_profiles wp ON wp.user_id = ws.worker_id
     WHERE ws.worker_id = $1 AND ws.service_id = ANY($2::int[])
       AND ws.is_active = true AND ws.approval_status = 'approved' AND wp.verification_status = 'approved'`,
    [workerId, serviceIds]
  );
  return rows.map((r) => ({ serviceId: r.service_id, price: Number(r.price) }));
}

// Manual booking, worker known upfront - every service gets its real price
// snapshotted immediately.
export async function create({ customerId, workerId, services, addressLabel, latitude, longitude }) {
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO bookings (customer_id, worker_id, price, address_label, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [customerId, workerId, totalPrice, addressLabel, latitude ?? null, longitude ?? null]
    );
    const bookingId = rows[0].id;
    for (const s of services) {
      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price) VALUES ($1, $2, $3)',
        [bookingId, s.serviceId, s.price]
      );
    }
    await client.query('COMMIT');
    return findById(bookingId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// No worker yet - that's the whole point of the instant flow. Each
// requested service is recorded with price = null; it's only priced once
// a worker claims the booking (see claimInstant).
export async function createInstant({ customerId, serviceIds, addressLabel, latitude, longitude }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO bookings (type, customer_id, address_label, latitude, longitude)
       VALUES ('instant', $1, $2, $3, $4) RETURNING id`,
      [customerId, addressLabel, latitude, longitude]
    );
    const bookingId = rows[0].id;
    for (const serviceId of serviceIds) {
      await client.query('INSERT INTO booking_services (booking_id, service_id, price) VALUES ($1, $2, NULL)', [
        bookingId,
        serviceId,
      ]);
    }
    await client.query('COMMIT');
    return findById(bookingId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Plain Haversine in SQL (no PostGIS/earthdistance extension - keeps this
// working on any Postgres, including Neon, with no extra setup). Only
// online, approved workers with a saved location who offer EVERY requested
// service are candidates - not just one of them.
export async function findNearbyOnlineWorkers(serviceIds, latitude, longitude, radiusKm) {
  const { rows } = await pool.query(
    `SELECT u.id AS worker_id
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE wp.verification_status = 'approved'
       AND wp.is_online = true
       AND wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL
       AND 6371 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(wp.latitude)) * cos(radians(wp.longitude) - radians($2))
             + sin(radians($1)) * sin(radians(wp.latitude))
           ))) <= $3
       AND (
         SELECT COUNT(DISTINCT ws.service_id) FROM worker_services ws
         WHERE ws.worker_id = u.id AND ws.is_active = true AND ws.approval_status = 'approved'
           AND ws.service_id = ANY($4::int[])
       ) = $5`,
    [latitude, longitude, radiusKm, serviceIds, serviceIds.length]
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

// Atomic first-accept-wins claim, then prices every requested service using
// THIS worker's current rates - if they no longer offer all of them (they
// could have changed their catalog between broadcast and claim), the whole
// claim is rolled back rather than left half-priced. Returns
// { booking: null, reason: 'already_taken' | 'services_unavailable' } on
// failure, { booking, reason: null } on success.
export async function claimInstant(bookingId, workerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimRes = await client.query(
      `UPDATE bookings SET worker_id = $2, status = 'accepted'
       WHERE id = $1 AND type = 'instant' AND status = 'requested' AND worker_id IS NULL
       RETURNING id`,
      [bookingId, workerId]
    );
    if (!claimRes.rows[0]) {
      await client.query('ROLLBACK');
      return { booking: null, reason: 'already_taken' };
    }

    const priceRes = await client.query(
      `SELECT bs.service_id, ws.price
       FROM booking_services bs
       JOIN worker_services ws ON ws.worker_id = $2 AND ws.service_id = bs.service_id
         AND ws.is_active = true AND ws.approval_status = 'approved'
       WHERE bs.booking_id = $1`,
      [bookingId, workerId]
    );
    const expected = await client.query('SELECT count(*)::int AS count FROM booking_services WHERE booking_id = $1', [
      bookingId,
    ]);
    if (priceRes.rows.length !== expected.rows[0].count) {
      await client.query('ROLLBACK');
      return { booking: null, reason: 'services_unavailable' };
    }

    let total = 0;
    for (const row of priceRes.rows) {
      const price = Number(row.price);
      total += price;
      await client.query('UPDATE booking_services SET price = $3 WHERE booking_id = $1 AND service_id = $2', [
        bookingId,
        row.service_id,
        price,
      ]);
    }
    await client.query('UPDATE bookings SET price = $2 WHERE id = $1', [bookingId, total]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { booking: await findById(bookingId), reason: null };
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
  if (!rows[0]) return null;
  const [booking] = await attachServices([toBooking(rows[0])]);
  return booking;
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
  return attachServices(rows.map(toBooking));
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

// initiatedBy is null for an admin override (adminCancelBooking) - neither
// party's own action, and outside the worker/customer CHECK constraint's
// concern.
export async function setCancelled(id, cancelledBy, reason, initiatedBy = null) {
  await pool.query(
    `UPDATE bookings SET status = 'cancelled', cancelled_by = $2, cancel_reason = $3, initiated_by = $4 WHERE id = $1`,
    [id, cancelledBy, reason ?? null, initiatedBy]
  );
  return findById(id);
}
