import * as workersApi from '../api/workers.api.js';

// After login/signup, customers land on their profile. Workers land on
// whichever step of the apply flow they're at.
export async function resolvePostAuthPath(user) {
  if (user.role !== 'worker') return '/profile';

  const { profile } = await workersApi.getMyWorkerData();
  if (profile.verificationStatus === 'unsubmitted' || profile.verificationStatus === 'rejected') {
    return '/worker/apply';
  }
  return '/worker/status';
}
