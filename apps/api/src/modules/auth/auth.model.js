import { pool } from '../../db/pool.js';

function toUser(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    profileImageUrl: row.profile_image_url,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
  };
}

export async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findByPhoneWithPassword(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  if (!rows[0]) return null;
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function createUser({ fullName, phone, email, passwordHash, role }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insert = await client.query(
      `INSERT INTO users (client_id, role, full_name, phone, email, password_hash)
       VALUES ('PENDING', $1, $2, $3, $4, $5)
       RETURNING *`,
      [role, fullName, phone, email ?? null, passwordHash]
    );
    const row = insert.rows[0];
    const clientId = `U${String(row.id).padStart(4, '0')}`;
    const updated = await client.query(
      'UPDATE users SET client_id = $1 WHERE id = $2 RETURNING *',
      [clientId, row.id]
    );

    if (role === 'worker') {
      await client.query('INSERT INTO worker_profiles (user_id) VALUES ($1)', [row.id]);
    }

    await client.query('COMMIT');
    return toUser(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
