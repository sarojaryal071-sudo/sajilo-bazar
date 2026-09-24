import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FullScreenSpinner } from './Skeleton.jsx';

export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/home" replace />;

  return children;
}
