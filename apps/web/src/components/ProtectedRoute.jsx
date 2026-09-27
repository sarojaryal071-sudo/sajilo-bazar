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
  if (role && user.role !== role) return <Navigate to="/home" replace />;

  return children;
}
