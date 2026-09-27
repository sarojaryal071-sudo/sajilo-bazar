import * as workersApi from '../api/workers.api.js';

// After login/signup, customers land on their profile, admins land on the
// admin dashboard, and workers land on whichever step of the apply flow
// they're at.
export async function resolvePostAuthPath(user) {
  if (user.role === 'admin') return '/admin/dashboard';
  if (user.role !== 'worker') return '/home';

  const { profile } = await workersApi.getMyWorkerData();
  // 'pending' also routes here (not just 'unsubmitted'/'rejected') - the
  // apply flow's own Step 5 shows the pending-status screen, and that's
  // also where a still-pending worker lands on every future login.
  if (
    profile.verificationStatus === 'unsubmitted' ||
    profile.verificationStatus === 'rejected' ||
    profile.verificationStatus === 'pending'
  ) {
    return '/worker/apply';
  }
  return '/worker/dashboard';
}
