import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h7v7H4V4ZM13 4h7v4h-7V4ZM13 11h7v9h-7v-9ZM4 14h7v6H4v-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ApprovalsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/admin/approvals', label: 'Approvals', icon: ApprovalsIcon },
];

// This layout is the entire access-control story on the frontend - a
// non-admin (or logged-out visitor) never even sees a sidebar, just a
// redirect. That's cosmetic, not security: the real gate is
// requireRole('admin') on every /api/admin route, which is what actually
// stops a non-admin from reading or mutating anything even if they guess a
// URL or call the API directly.
//
// Deliberately its own shell, not a reskinned AppShell - the customer/
// worker bottom nav doesn't belong here, and staff tooling reads better as
// a sidebar than a mobile tab bar.
export function AdminShell() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/home" replace />;

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-raised px-3 py-6">
        <p className="px-3 pb-6 text-lg font-bold">Sajilo Bazar</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand text-text-onBrand' : 'text-text-muted hover:bg-surface-alt'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-muted hover:bg-surface-alt"
        >
          Log out
        </button>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
