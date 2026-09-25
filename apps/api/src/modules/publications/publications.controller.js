import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from '../admin/admin.model.js';

const ROLE_TO_AUDIENCE = { customer: 'customers', worker: 'workers' };
const VALID_AUDIENCES = new Set(['customers', 'workers']);

// The only publicly-readable slice of the admin Publications screen -
// live type='promotion' publications for the Home/Dashboard carousel.
// type='notification' publications never reach a client through this
// endpoint; they only ever arrive as real rows in the notifications table
// (see admin.service.js setPublicationStatus).
export async function getActivePromotions(req, res, next) {
  try {
    const audience = req.query.audience || ROLE_TO_AUDIENCE[req.user.role];
    if (!VALID_AUDIENCES.has(audience)) {
      return next(new ApiError(400, 'Invalid audience'));
    }
    const promotions = await adminModel.listActivePromotions(audience);
    res.json({ promotions });
  } catch (err) {
    next(err);
  }
}
