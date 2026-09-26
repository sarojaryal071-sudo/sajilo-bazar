import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BottomNav } from './BottomNav.jsx';
import { HamburgerMenu } from './HamburgerMenu.jsx';
import { Sidebar } from './Sidebar.jsx';
import { FullScreenSpinner } from './Skeleton.jsx';

// Layout for the main tabbed area - auth gate plus a persistent nav, with a
// different tab set per role (customer: Home/Bookings, worker:
// Dashboard/Jobs), then Alerts and a hamburger menu tab shared by both -
// see BottomNav.jsx. The worker-apply screen stays outside this shell; it's
// a standalone form flow, not a tab. The notification bell and hamburger
// menu live inside BottomNav as tabs (Messenger-style), not a separate top
// bar - a standalone bar left an unwanted gap above the content. Profile,
// Settings, Language, Theme, and Help/Support are reachable only through
// the hamburger menu now, not as their own bottom-nav tabs.
//
// Desktop widths (Piece C, 2026-09-27): a fixed bottom tab bar and a
// slide-out overlay menu are mobile patterns that make no sense once
// there's a whole sidebar's worth of width, so `Sidebar` (same
// destinations, laid out as a persistent left rail) replaces both at
// `lg:` - it and BottomNav/HamburgerMenu's trigger carry matching
// lg:flex/lg:hidden so exactly one of the two ever renders. HamburgerMenu
// itself stays mounted either way (harmless - it can only ever be opened
// via BottomNav's own menu button, which is hidden at that width).
//
// This wrapper is the sole owner of the full-viewport-height guarantee for
// everything it wraps - the inner Screen (rendered via Outlet) uses
// fillHeight={false} and just grows to fill it (flex-1), so the two never
// both claim min-height and stack. The nav-clearance padding (pb-20) lives
// on the flex-1 wrapper, inside that height budget, not added beyond it -
// dropped entirely at lg: since the sidebar replaces the bottom bar there.
export function AppShell() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        <Outlet />
      </div>
      <BottomNav role={user.role} onOpenMenu={() => setMenuOpen(true)} />
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
