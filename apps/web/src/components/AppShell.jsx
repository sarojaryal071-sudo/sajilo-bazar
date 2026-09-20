import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BottomNav } from './BottomNav.jsx';

// Layout for the main tabbed area - auth gate plus a persistent bottom nav,
// with a different tab set per role (customer: Home/Search/Bookings/Profile,
// worker: Dashboard/Jobs/Profile - see BottomNav.jsx). The worker-apply
// screen stays outside this shell; it's a standalone form flow, not a tab.
export function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="pb-20">
      <Outlet />
      <BottomNav role={user.role} />
    </div>
  );
}
