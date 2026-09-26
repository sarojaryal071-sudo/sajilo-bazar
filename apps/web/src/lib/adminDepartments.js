// Admin RBAC (2026-09-27). Four assignable departments - Super Admin is a
// separate flag (user.isSuperAdmin), never a fifth value here.
export const ADMIN_DEPARTMENTS = ['support', 'finance', 'operations', 'people_content'];

export const DEPARTMENT_LABEL = {
  support: 'Support',
  finance: 'Finance',
  operations: 'Operations',
  people_content: 'People & Content',
};

// One distinct Badge tone per department - the existing Badge component
// has exactly four tones (neutral/success/warning/danger), a 1:1 fit with
// the four departments, so no new tone/color needed.
export const DEPARTMENT_TONE = {
  support: 'warning',
  finance: 'success',
  operations: 'neutral',
  people_content: 'danger',
};

export function canAccessDepartment(access, ...departments) {
  if (!access) return false;
  return access.isSuperAdmin || departments.some((d) => access.departments?.includes(d));
}
