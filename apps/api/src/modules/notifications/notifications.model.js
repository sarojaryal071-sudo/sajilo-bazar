import { pool } from '../../db/pool.js';

function toNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    payload: row.payload,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function create({ userId, type, payload }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3) RETURNING *`,
    [userId, type, JSON.stringify(payload ?? {})]
  );
  return toNotification(rows[0]);
}

export async function listForUser(userId, { unreadOnly } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 AND ($2::boolean IS NOT TRUE OR read_at IS NULL)
     ORDER BY created_at DESC LIMIT 50`,
    [userId, unreadOnly ?? false]
  );
  return rows.map(toNotification);
}

export async function countUnread(userId) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return rows[0].count;
}

export async function markRead(id, userId) {
  const { rows } = await pool.query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *`,
    [id, userId]
  );
  return rows[0] ? toNotification(rows[0]) : null;
}

export async function markAllRead(userId) {
  await pool.query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [userId]);
}

// No row for a category means "on" - see the notification_preferences
// migration. Returns just the categories a user has explicitly touched;
// the service layer fills in the rest as true.
export async function listPreferenceOverrides(userId) {
  const { rows } = await pool.query(
    'SELECT category, in_app FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  return rows.map((r) => ({ category: r.category, inApp: r.in_app }));
}

export async function setPreference(userId, category, inApp) {
  await pool.query(
    `INSERT INTO notification_preferences (user_id, category, in_app, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, category) DO UPDATE SET in_app = EXCLUDED.in_app, updated_at = now()`,
    [userId, category, inApp]
  );
}

// The single point notify() checks before writing/pushing a notification -
// absence of a row (the common case) means allowed.
export async function isCategoryAllowed(userId, category) {
  const { rows } = await pool.query(
    'SELECT in_app FROM notification_preferences WHERE user_id = $1 AND category = $2',
    [userId, category]
  );
  return rows[0] ? rows[0].in_app : true;
}
