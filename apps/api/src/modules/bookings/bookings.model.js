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
