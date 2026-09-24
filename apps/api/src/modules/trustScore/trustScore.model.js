import { pool } from '../../db/pool.js';

export async function findScoringProfile(workerId) {
  const { rows } = await pool.query(
    'SELECT user_id, rating_avg, jobs_completed_count, approved_at, trust_score FROM worker_profiles WHERE user_id = $1',
    [workerId]
  );
  if (!rows[0]) return null;
  return {
    userId: rows[0].user_id,
    ratingAvg: Number(rows[0].rating_avg),
    jobsCompletedCount: rows[0].jobs_completed_count,
    approvedAt: rows[0].approved_at,
    trustScore: rows[0].trust_score === null ? null : Number(rows[0].trust_score),
  };
}

// The worker's most recent 30 "terminal jobs" that are actually relevant to
// their own cancellation rate - completed jobs, plus cancellations THEY
// initiated. A customer-initiated cancellation is deliberately excluded
// entirely (not just from the numerator) - the business plan says those
// "don't affect anything yet", so they neither inflate the denominator nor
// dilute the rate.
export async function findRecentReliabilityJobs(workerId, limit) {
  const { rows } = await pool.query(
    `SELECT id, status, created_at
     FROM bookings
     WHERE worker_id = $1
       AND (status = 'completed' OR (status = 'cancelled' AND initiated_by = 'worker'))
     ORDER BY created_at DESC
     LIMIT $2`,
    [workerId, limit]
  );
  return rows.map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at }));
}

export async function updateTrustScore(workerId, score) {
  await pool.query('UPDATE worker_profiles SET trust_score = $2 WHERE user_id = $1', [workerId, score]);
}
