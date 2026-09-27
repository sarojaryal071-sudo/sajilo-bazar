import { pool } from '../../db/pool.js';

function toSetting(row) {
  return { key: row.key, value: row.value, updatedAt: row.updated_at, updatedBy: row.updated_by };
}

export async function getValue(key) {
  const { rows } = await pool.query('SELECT value FROM platform_settings WHERE key = $1', [key]);
  return rows[0] ? rows[0].value : null;
}

export async function listSettings() {
  const { rows } = await pool.query('SELECT * FROM platform_settings ORDER BY key');
  return rows.map(toSetting);
}

// UPDATE, not upsert - keys are pre-seeded by migration; the API only ever
// edits a value for a key that already exists (see EDITABLE_KEYS in
// platformSettings.service.js), never creates one on the fly.
export async function setValue(key, value, updatedBy) {
  const { rows } = await pool.query(
    `UPDATE platform_settings SET value = $2, updated_by = $3, updated_at = now()
     WHERE key = $1 RETURNING *`,
    [key, JSON.stringify(value), updatedBy]
  );
  return rows[0] ? toSetting(rows[0]) : null;
}
