import { pool } from '../../db/pool.js';

function toUser(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    phoneVerified: row.phone_verified,
    email: row.email,
    profileImageUrl: row.profile_image_url,
    moderationStatus: row.moderation_status,
    deactivatedAt: row.deactivated_at,
    deletedAt: row.deleted_at,
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

export async function findByGoogleId(googleId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] ? toUser(rows[0]) : null;
}

// Only used to opportunistically link a Google sign-in to an existing
// phone+password account sharing the same (Google-verified) email address -
// never used to look up a login credential.
export async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function linkGoogleId(userId, googleId) {
  const { rows } = await pool.query(
    'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
    [googleId, userId]
  );
  return toUser(rows[0]);
}

// Logging back in is what reverses a self-service deactivation (Settings ->
// Deactivate account) - a no-op if the account isn't currently deactivated.
export async function reactivate(userId) {
  const { rows } = await pool.query(
    'UPDATE users SET deactivated_at = NULL, updated_at = now() WHERE id = $1 RETURNING *',
    [userId]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

// "Forgot password" reset (business-accepted no-verification flow for this
// testing phase) - also how a Google-only account (no password_hash yet)
// gains its first password. Returns null if no account has that phone.
export async function updatePasswordByPhone(phone, passwordHash) {
  const { rows } = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE phone = $2 RETURNING *',
    [passwordHash, phone]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

// googleId/passwordHash are mutually optional (never both null in
// practice): a phone+password signup passes passwordHash and no googleId,
// a Google signup passes googleId and no passwordHash (password_hash stays
// NULL until the user later sets one via "Forgot password").
export async function createUser({ fullName, phone, email, passwordHash = null, role, googleId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insert = await client.query(
      `INSERT INTO users (client_id, role, full_name, phone, email, password_hash, google_id)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [role, fullName, phone, email ?? null, passwordHash, googleId]
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
