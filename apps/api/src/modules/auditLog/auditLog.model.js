import { pool } from '../../db/pool.js';

export async function insert({ actorId, action, severity, targetType, targetId, oldValue, newValue }) {
  await pool.query(
    `INSERT INTO admin_audit_log (actor_id, action, severity, target_type, target_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actorId ?? null,
      action,
      severity,
      targetType ?? null,
      targetId ?? null,
      oldValue === undefined ? null : JSON.stringify(oldValue),
      newValue === undefined ? null : JSON.stringify(newValue),
    ]
  );
}

const LIST_CAP = 200;

function toEntry(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorPhone: row.actor_phone,
    action: row.action,
    severity: row.severity,
    targetType: row.target_type,
    targetId: row.target_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  };
}

// actions is the lens filter, already resolved to a concrete action list by
// the service (this table has no lens column - a lens is a grouping over
// `action`, not a stored fact). Every filter is optional and additive.
export async function list({ actions, severity, actorId, from, to }) {
  const { rows } = await pool.query(
    `SELECT l.*, u.full_name AS actor_name, u.phone AS actor_phone
     FROM admin_audit_log l
     LEFT JOIN users u ON u.id = l.actor_id
     WHERE ($1::text[] IS NULL OR l.action = ANY($1::text[]))
       AND ($2::text IS NULL OR l.severity = $2)
       AND ($3::int IS NULL OR l.actor_id = $3)
       AND ($4::timestamptz IS NULL OR l.created_at >= $4)
       AND ($5::timestamptz IS NULL OR l.created_at <= $5)
     ORDER BY l.created_at DESC
     LIMIT ${LIST_CAP}`,
    [actions ?? null, severity || null, actorId ?? null, from || null, to || null]
  );
  return rows.map(toEntry);
}
