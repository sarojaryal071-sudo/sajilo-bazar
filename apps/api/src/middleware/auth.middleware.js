import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { ApiError } from './error.middleware.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden'));
    }
    next();
  };
}

// Server-side enforcement that a worker is actually approved before they
// can touch worker-only functionality (going online, accepting/completing
// jobs, adding services) - a pending/rejected worker hiding these actions
// in the UI isn't enough, since the API itself must refuse them too.
export async function requireApprovedWorker(req, res, next) {
  if (!req.user || req.user.role !== 'worker') {
    return next(new ApiError(403, 'Forbidden'));
  }
  try {
    const { rows } = await pool.query(
      'SELECT verification_status FROM worker_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (rows[0]?.verification_status !== 'approved') {
      return next(new ApiError(403, 'Your worker account is not yet approved'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
