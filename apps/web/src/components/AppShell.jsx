import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BottomNav } from './BottomNav.jsx';
import { Sidebar } from './Sidebar.jsx';
import { FullScreenSpinner } from './Skeleton.jsx';

// Layout for the main tabbed area - auth gate plus a persistent nav, with a
// different tab set per role (customer: Home/Bookings, worker:
// Dashboard/Jobs), then Alerts and Menu shared by both - see BottomNav.jsx.
// The notification bell and Menu tab live inside BottomNav as tabs
// (Messenger-style), not a separate top bar - a standalone bar left an
// unwanted gap above the content. Menu navigates straight to the Profile
// page (UI round: replaced the old hamburger overlay) - Settings, Language,
// Theme, and Help/Support are reached by drilling in from there.
//
// /worker/apply is nested in this same shell (worker signup rework,
// 2026-09-27) rather than kept standalone, so the onboarding flow gets the
// same persistent nav chrome as everywhere else - just restricted to Help
// + Logout (see BottomNav/Sidebar's `restricted` prop), since Home/
// Bookings/Alerts/Menu don't apply to a not-yet-verified worker.
//
// Keyed off `user.verificationStatus` (not the current route) - a route
// check alone missed every OTHER AppShell-wrapped screen a not-yet-
// verified worker can reach from the restricted nav itself, e.g. Help
// leaking the full Dashboard/Jobs/Alerts/Menu bar once opened. Comes for
// free on every `user` (see users.model.js `attachWorkerVerificationStatus`,
// the same conditional-join pattern `attachAdminDepartments` already
// uses) - no extra fetch here.
//
// Desktop widths (Piece C, 2026-09-27): a fixed bottom tab bar is a mobile
// pattern that makes no sense once there's a whole sidebar's worth of
// width, so `Sidebar` (same destinations, laid out as a persistent left
// rail) replaces it at `lg:` - the two carry matching lg:flex/lg:hidden so
// exactly one of them ever renders.
//
// This wrapper is the sole owner of the full-viewport-height guarantee for
// everything it wraps - the inner Screen (rendered via Outlet) uses
// fillHeight={false} and just grows to fill it (flex-1), so the two never
// both claim min-height and stack. The nav-clearance padding (pb-20) lives
// on the flex-1 wrapper, inside that height budget, not added beyond it -
// dropped entirely at lg: since the sidebar replaces the bottom bar there.
export function AppShell() {
  const { user, loading } = useAuth();
  const restricted = user?.role === 'worker' && user.verificationStatus && user.verificationStatus !== 'approved';

  if (loading) return <FullScreenSpinner />;
  // Also where a logout lands (see AuthContext.jsx logout) - the landing
  // page, not straight into the login form.
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar role={user.role} restricted={restricted} />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        <Outlet />
      </div>
      <BottomNav role={user.role} restricted={restricted} />
    </div>
  );
}
