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
