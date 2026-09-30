import * as auditLogModel from './auditLog.model.js';

// Every lens/severity mapping in this file is a judgment call (the target
// spec asks for "a severity you judge reasonable" and three lenses without
// pinning exact action names) - see the Phase 2 completion notes in
// docs/admin-panel-target-spec.md for the reasoning, not just this list.
//
// Security: logins, password changes, and anything that grants/changes who
// can act as staff (creating a staff account is itself an access grant).
// Operations: day-to-day moderation/case-handling - nothing here is
// reversible-by-a-click, but none of it is platform-wide either.
// Finance: nothing charges/refunds money yet (that's a later Finance
// phase), but platform_settings already controls pricing (fuel fee/rate,
// service price bands, commission rate, and now matching radius/flat fuel
// charge) - a bad edit there is a revenue-or-matching-shaped mistake
// before a single payment module exists, so it's filed under Finance
// rather than Operations.
const ACTION_LENS = {
  'auth.login_success': 'security',
  'auth.login_failed': 'security',
  'auth.password_reset': 'security',
  'staff.created': 'security',
  'staff.access_updated': 'security',
  'user.suspended': 'operations',
  'user.reinstated': 'operations',
  'verification.document_approved': 'operations',
  'verification.document_rejected': 'operations',
  'worker_service.approved': 'operations',
  'worker_service.rejected': 'operations',
  'dispute.resolved': 'operations',
  'dispute.escalated': 'operations',
  'service.updated': 'operations',
  'platform_setting.updated': 'finance',
  // Districts (Platform Configuration, target-spec Phase 6) - filed under
  // Operations, same bucket as service.updated: it's catalog/coverage
  // management (where the business serves customers), not a staff/
  // security change and not itself a pricing number.
  'district.created': 'operations',
  'district.activated': 'operations',
  'district.deactivated': 'operations',
};

const LENSES = ['security', 'operations', 'finance'];

function actionsForLens(lens) {
  return Object.entries(ACTION_LENS)
    .filter(([, l]) => l === lens)
    .map(([action]) => action);
}

// The write side - called from wherever a sensitive action already
// happens, right after it succeeds. Deliberately never throws: a logging
// hiccup must not fail (or worse, appear to have failed and get retried)
// the real action it's recording. Logs to stderr instead so a broken audit
// write is still visible in server logs without taking the request down.
export async function logAudit(entry) {
  try {
    await auditLogModel.insert(entry);
  } catch (err) {
    console.error('Failed to write admin_audit_log entry:', entry.action, err);
  }
}

export async function listAuditLog({ lens, severity, actorId, from, to }) {
  const actions = lens && LENSES.includes(lens) ? actionsForLens(lens) : null;
  return auditLogModel.list({ actions, severity, actorId, from, to });
}
