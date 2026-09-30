import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FullScreenSpinner } from './Skeleton.jsx';

export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  // Also where a logout lands (see AuthContext.jsx logout) - the landing
  // page, not straight into the login form; Login/Signup are one tap away
  // from there via its own header buttons.
  if (!user) return <Navigate to="/" replace />;
  // Same gate as AppShell.jsx (a worker who just logged in with an
  // admin-issued temp password, target-spec Phase 9/10) - these routes sit
  // outside the AppShell layout, so they need their own copy of the check
  // rather than relying on AppShell's. ChangePassword itself isn't routed
  // through ProtectedRoute (see App.jsx) - it does its own lighter
  // auth-only check - so this never redirects to itself.
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (role && user.role !== role) return <Navigate to="/home" replace />;

  return children;
}
