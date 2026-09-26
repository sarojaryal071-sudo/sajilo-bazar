import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useIsDesktop } from '../hooks/useIsDesktop.js';
import { canAccessDepartment } from '../lib/adminDepartments.js';
import { FullScreenSpinner } from './Skeleton.jsx';

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

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4M16 2v4M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41 12 22l-9-9V4h9l8.59 8.59a2 2 0 0 1 0 2.82Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.5" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 17c.5-2 2-3 4-3s3.5 1 4 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveOpsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9-6-18-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 15.5c.5.8 1.4 1.3 2.5 1.3 1.5 0 2.7-.9 2.7-2s-1.2-1.7-2.7-2-2.7-.9-2.7-2 1.2-2 2.7-2c1.1 0 2 .5 2.5 1.3M12 6.5v11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DisputesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.1 5.1l3.5 3.5M15.4 15.4l3.5 3.5M18.9 5.1l-3.5 3.5M8.6 15.4l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PublicationsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8a4 4 0 0 1 0 8M18.5 5.5a8 8 0 0 1 0 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PoliciesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Admin RBAC (2026-09-27) - the flat list above became grouped sections,
// each gated by the department that owns it. Overview has no department
// (everyone with any admin access sees Dashboard) and no group header,
// same treatment as before. Users appears in both Support (its one
// deliberate read-only cross-department exception) and People & Content
// (its real home) - resolved below so it never renders twice.
const USERS_ITEM = { to: '/admin/users', label: 'Users', icon: UsersIcon };

const NAV_GROUPS = [
  {
    key: 'overview',
    label: null,
    department: null,
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: DashboardIcon }],
  },
  {
    key: 'operations',
    label: 'Operations',
    department: 'operations',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: BookingsIcon },
      { to: '/admin/live-ops', label: 'Live Ops', icon: LiveOpsIcon },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    department: 'support',
    items: [
      { to: '/admin/disputes', label: 'Disputes', icon: DisputesIcon },
      { to: '/admin/support', label: 'Support tickets', icon: SupportIcon },
    ],
  },
  {
    // Deliberately standalone even though it's thin today - it's the one
    // place access control matters most, and it'll fill in once refunds/
    // payouts exist.
    key: 'finance',
    label: 'Finance',
    department: 'finance',
    items: [{ to: '/admin/accounting', label: 'Accounting', icon: AccountingIcon }],
  },
  {
    key: 'people_content',
    label: 'People & Content',
    department: 'people_content',
    items: [
      USERS_ITEM,
      { to: '/admin/approvals', label: 'Approvals', icon: ApprovalsIcon },
      { to: '/admin/staff', label: 'Staff', icon: StaffIcon },
      { to: '/admin/categories', label: 'Categories/Services', icon: CategoriesIcon },
      { to: '/admin/publications', label: 'Publications', icon: PublicationsIcon },
      { to: '/admin/policies', label: 'Policies', icon: PoliciesIcon },
    ],
  },
];

// Settings is a plain standalone top-level link, Super Admin only - no
// group/dropdown wrapper (a section header with one lonely child).
const SETTINGS_ITEM = { to: '/admin/settings', label: 'Settings', icon: SettingsIcon };

function getVisibleNavGroups(access) {
  const groups = NAV_GROUPS.filter((g) => !g.department || canAccessDepartment(access, g.department));
  const hasPeopleContent = groups.some((g) => g.key === 'people_content');
  // Support's read-only Users exception only surfaces here when People &
  // Content isn't already showing it - a Support+People&Content staffer
  // sees Users once, under its real home. Builds a new group object rather
  // than mutating NAV_GROUPS, which is shared module-level state.
  return groups.map((g) =>
    g.key === 'support' && !hasPeopleContent ? { ...g, items: [...g.items, USERS_ITEM] } : g
  );
}

function DesktopOnlyMessage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <p className="max-w-sm text-lg font-medium text-text-muted">
        This cannot be accessed from your current device. Please log in again from your PC.
      </p>
    </div>
  );
}

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
//
// Desktop-only: below the breakpoint, useIsDesktop returns false and this
// returns the blocked-device message *instead of* <Outlet/> - the child
// route (Dashboard, Approvals, ...) never mounts at all on a small screen,
// so no admin data fetch ever fires there. Since it's desktop-only, the
// sidebar is simple and fixed - no collapse/toggle affordance needed, same
// as any other desktop app's sidebar.
function NavItemLink({ to, label, icon: Icon }) {
  return (
    <NavLink
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
  );
}

export function AdminShell() {
  const { user, loading, logout } = useAuth();
  const isDesktop = useIsDesktop();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/home" replace />;
  if (!isDesktop) return <DesktopOnlyMessage />;

  const access = { isSuperAdmin: user.isSuperAdmin, departments: user.departments ?? [] };
  const visibleGroups = getVisibleNavGroups(access);

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-raised px-3 py-6">
        <p className="px-3 pb-6 text-lg font-bold">Sajilo Bazar</p>
        <nav className="flex flex-1 flex-col gap-4">
          {visibleGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              {group.label && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavItemLink key={item.to} {...item} />
              ))}
            </div>
          ))}
          {access.isSuperAdmin && (
            <div className="mt-2 border-t border-border pt-3">
              <NavItemLink {...SETTINGS_ITEM} />
            </div>
          )}
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
