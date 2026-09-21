import * as workersApi from '../api/workers.api.js';

// After login/signup, customers land on their profile, admins land on the
// admin dashboard, and workers land on whichever step of the apply flow
// they're at.
export async function resolvePostAuthPath(user) {
  if (user.role === 'admin') return '/admin/dashboard';
  if (user.role !== 'worker') return '/home';

  const { profile } = await workersApi.getMyWorkerData();
  if (profile.verificationStatus === 'unsubmitted' || profile.verificationStatus === 'rejected') {
    return '/worker/apply';
  }
  return '/worker/dashboard';
}
