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

const POLICY_TYPES = ['terms_of_service', 'privacy_policy', 'community_guidelines'];

// Fully public (no requireAuth) - /terms, /privacy, and /community-
// guidelines are reachable from the Landing page by a signed-out visitor
// (see App.jsx's public route list), unlike the promotions carousel above
// which only ever renders inside an already-authenticated shell. Only ever
// serves a published policy - a draft mid-edit should never reach a real
// visitor just because an admin saved it (see admin.model.js
// findPolicyByType/the Policies editor's Publish/Unpublish toggle).
export async function getPublicPolicy(req, res, next) {
  try {
    const { policyType } = req.params;
    if (!POLICY_TYPES.includes(policyType)) return next(new ApiError(400, 'Invalid policy type'));
    const policy = await adminModel.findPolicyByType(policyType);
    if (!policy || policy.status !== 'published') return next(new ApiError(404, 'Policy not found'));
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}
