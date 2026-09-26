import { ApiError } from '../../middleware/error.middleware.js';
import * as adminModel from './admin.model.js';

// Department access is looked up fresh on every request rather than baked
// into the JWT - a Super Admin changing a staff account's grants from the
// Staff screen needs to take effect immediately, not on that staff
// member's next login/token refresh.
export function requireDepartment(...departments) {
  return async (req, res, next) => {
    try {
      const access = await adminModel.getAdminAccess(req.user.id);
      req.adminAccess = access;
      if (access.isSuperAdmin || departments.some((d) => access.departments.includes(d))) {
        return next();
      }
      return next(new ApiError(403, 'Forbidden'));
    } catch (err) {
      next(err);
    }
  };
}

// Analytics (the Dashboard tab) and Settings (platform_settings) are
// Super-Admin-only, never department-gated - moving Analytics onto the
// universal Dashboard page changed its location, not its access control.
export async function requireSuperAdmin(req, res, next) {
  try {
    const access = await adminModel.getAdminAccess(req.user.id);
    req.adminAccess = access;
    if (access.isSuperAdmin) return next();
    return next(new ApiError(403, 'Forbidden'));
  } catch (err) {
    next(err);
  }
}
