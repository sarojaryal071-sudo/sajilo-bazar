import { pool } from '../../db/pool.js';

function toAddress(row) {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    addressLabel: row.address_label,
    latitude: row.latitude,
    longitude: row.longitude,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export async function listForUser(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC',
    [userId]
  );
  return rows.map(toAddress);
}

export async function findById(id, userId) {
  const { rows } = await pool.query('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0] ? toAddress(rows[0]) : null;
}

export async function countForUser(userId) {
  const { rows } = await pool.query('SELECT count(*)::int AS count FROM addresses WHERE user_id = $1', [userId]);
  return rows[0].count;
}

export async function create(userId, { label, addressLabel, latitude, longitude, isDefault }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isDefault) {
      await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }
    const { rows } = await client.query(
      `INSERT INTO addresses (user_id, label, address_label, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, label, addressLabel, latitude ?? null, longitude ?? null, Boolean(isDefault)]
    );
    await client.query('COMMIT');
    return toAddress(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(id, userId, { label, addressLabel, latitude, longitude }) {
  const { rows } = await pool.query(
    `UPDATE addresses SET
       label = COALESCE($1, label),
       address_label = COALESCE($2, address_label),
       latitude = COALESCE($3, latitude),
       longitude = COALESCE($4, longitude)
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [label ?? null, addressLabel ?? null, latitude ?? null, longitude ?? null, id, userId]
  );
  return rows[0] ? toAddress(rows[0]) : null;
}

export async function remove(id, userId) {
  const { rowCount } = await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// Unsets any existing default first (the DB's partial unique index would
// otherwise reject having two) then sets this one, both in one transaction.
export async function setDefault(id, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    const { rows } = await client.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    await client.query('COMMIT');
    return rows[0] ? toAddress(rows[0]) : null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
