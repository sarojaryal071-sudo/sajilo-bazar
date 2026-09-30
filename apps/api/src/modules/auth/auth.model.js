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
    isSuperAdmin: row.is_super_admin,
    deactivatedAt: row.deactivated_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    mustChangePassword: row.must_change_password,
  };
}

// Only role='admin' accounts ever have department grants - attaching this
// unconditionally for every login would be a wasted query for the
// customer/worker majority of logins.
async function attachAdminDepartments(user) {
  if (user.role !== 'admin') return user;
  const { rows } = await pool.query('SELECT department FROM admin_department_grants WHERE user_id = $1', [
    user.id,
  ]);
  return { ...user, departments: rows.map((r) => r.department) };
}

export async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findByPhoneWithPassword(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  if (!rows[0]) return null;
  const user = await attachAdminDepartments(toUser(rows[0]));
  return { ...user, passwordHash: rows[0].password_hash };
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

// The forced change-password screen after a temp-password login - unlike
// updatePasswordByPhone above (the open "forgot password" flow), this also
// clears must_change_password in the same statement, since setting a new
// password IS what satisfies the requirement.
export async function updatePasswordAndClearMustChange(userId, passwordHash) {
  const { rows } = await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = now() WHERE id = $2 RETURNING *',
    [passwordHash, userId]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

// googleId/passwordHash are mutually optional (never both null in
// practice): a phone+password signup passes passwordHash and no googleId,
// a Google signup passes googleId and no passwordHash (password_hash stays
// NULL until the user later sets one via "Forgot password").
//
// client_id is derived from the row's own id ("U0042"), which isn't known
// until the row exists - previously handled by inserting a hardcoded
// 'PENDING' placeholder and updating it to the real value right after.
// That placeholder was the SAME literal string across every signup, so
// two signups whose INSERTs overlapped (even briefly, before either had
// reached its UPDATE) collided on users_client_id_key - the bug this
// replaces. Pulling the id from the sequence up front (via a CTE, in one
// statement) and writing the real client_id directly means no signup ever
// touches a shared placeholder value, so there's nothing left to collide.
export async function createUser({ fullName, phone, email, passwordHash = null, role, googleId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insert = await client.query(
      `WITH new_id AS (SELECT nextval(pg_get_serial_sequence('users', 'id')) AS id)
       INSERT INTO users (id, client_id, role, full_name, phone, email, password_hash, google_id)
       SELECT id, 'U' || lpad(id::text, 4, '0'), $1, $2, $3, $4, $5, $6
       FROM new_id
       RETURNING *`,
      [role, fullName, phone, email ?? null, passwordHash, googleId]
    );
    const row = insert.rows[0];

    if (role === 'worker') {
      await client.query('INSERT INTO worker_profiles (user_id) VALUES ($1)', [row.id]);
    }

    await client.query('COMMIT');
    return toUser(row);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
