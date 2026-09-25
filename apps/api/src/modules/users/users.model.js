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
    googleId: row.google_id,
    hasPassword: row.password_hash != null,
    deactivatedAt: row.deactivated_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function updateProfile(id, { fullName, email, profileImageUrl }) {
  const { rows } = await pool.query(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       email = COALESCE($2, email),
       profile_image_url = COALESCE($3, profile_image_url),
       updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [fullName ?? null, email ?? null, profileImageUrl ?? null, id]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

// Reversible: the worker/customer-facing effects (hidden from search, can't
// book/be booked) are enforced by queries checking deactivated_at IS NULL
// elsewhere, not by a status enum - logging back in (auth.service.js login)
// clears this same column, so there's nothing else to "undo".
export async function deactivate(id) {
  const { rows } = await pool.query(
    'UPDATE users SET deactivated_at = now(), updated_at = now() WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function reactivate(id) {
  const { rows } = await pool.query(
    'UPDATE users SET deactivated_at = NULL, updated_at = now() WHERE id = $1 AND deactivated_at IS NOT NULL RETURNING *',
    [id]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

// Irreversible - the in-app "delete my account" request from the Privacy
// Policy. Anonymizes PII in place (name/phone/email/photo/credentials)
// rather than deleting the row, since bookings/disputes/commission_ledger
// all FK to users.id and must survive in anonymized form per the Policy's
// retention section; phone stays UNIQUE NOT NULL so it gets a synthetic
// placeholder rather than NULL.
export async function anonymize(id) {
  const { rows } = await pool.query(
    `UPDATE users SET
       full_name = 'Deleted user',
       phone = 'deleted-' || id,
       email = NULL,
       profile_image_url = NULL,
       password_hash = NULL,
       google_id = NULL,
       deleted_at = now(),
       deactivated_at = NULL,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findByGoogleId(googleId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function setGoogleId(id, googleId) {
  const { rows } = await pool.query('UPDATE users SET google_id = $1, updated_at = now() WHERE id = $2 RETURNING *', [
    googleId,
    id,
  ]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function clearGoogleId(id) {
  const { rows } = await pool.query(
    'UPDATE users SET google_id = NULL, updated_at = now() WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] ? toUser(rows[0]) : null;
}
