import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BottomNav } from './BottomNav.jsx';

// Layout for the main tabbed area (Home, Search, Bookings, Profile) - auth
// gate plus the persistent bottom nav. Worker-apply/status screens stay
// outside this shell for now; they're a standalone flow, not a nav tab.
//
// The nav itself is customer-only: Home/Search/Bookings are customer
// screens (worker equivalents - Jobs, Dashboard - are a later build step).
// A worker landing on /profile still renders fine, just without the tab
// bar, same as before this shell existed.
export function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={user.role === 'customer' ? 'pb-20' : ''}>
      <Outlet />
      {user.role === 'customer' && <BottomNav />}
    </div>
  );
}
