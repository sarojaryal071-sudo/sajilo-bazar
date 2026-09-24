import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from '../admin/admin.model.js';

const ROLE_TO_AUDIENCE = { customer: 'customers', worker: 'workers' };
const VALID_AUDIENCES = new Set(['customers', 'workers']);

export async function getActive(req, res, next) {
  try {
    const audience = req.query.audience || ROLE_TO_AUDIENCE[req.user.role];
    if (!VALID_AUDIENCES.has(audience)) {
      return next(new ApiError(400, 'Invalid audience'));
    }
    const announcement = await adminModel.findLatestActiveAnnouncement(audience);
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
}
