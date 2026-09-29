import { Link, NavLink, useLocation } from 'react-router-dom';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
  bookings: (
    <path d="M8 2v4M16 2v4M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
  ),
  dashboard: <path d="M4 4h7v7H4V4ZM13 4h7v4h-7V4ZM13 11h7v9h-7v-9ZM4 14h7v6H4v-6Z" />,
  jobs: (
    <path d="M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2" />
      <path d="M12 17.5h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
      <path d="M9 12h12M17 8l4 4-4 4" />
    </>
  ),
};

// Routes the Menu tab should still highlight as active for, even though it
// links straight to /profile - Settings and Help are reached by drilling in
// from there (the gear icon, and Settings' own Support section), so a
// customer/worker on either still reads as "in the Menu area".
const MENU_ROUTES = ['/profile', '/settings', '/help'];

export function NavIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <g strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</g>
    </svg>
  );
}

// No Search tab - search lives inside Home (the search bar at its top,
// tappable to enter search mode), not as a separate nav destination. No
// standalone Profile tab either - Menu links straight to /profile (see
// MENU_ROUTES above), which is now the Profile/Account page itself.
export const CUSTOMER_TABS = [
  { to: '/home', icon: 'home', labelKey: 'nav.home' },
  { to: '/bookings', icon: 'bookings', labelKey: 'nav.bookings' },
];

export const WORKER_TABS = [
  { to: '/worker/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
  { to: '/worker/jobs', icon: 'jobs', labelKey: 'nav.jobs' },
];

// Messenger-style: the notification bell and Menu both live as tabs
// alongside the role's other tabs, rather than a separate top bar (which
// left an unwanted gap above the content). They're appended here rather
// than baked into CUSTOMER_TABS/WORKER_TABS since the bell carries a live
// badge. Menu used to open a hamburger overlay (UI round: removed) - it now
// navigates straight to the Profile page, same as any other tab, just
// highlighted active across the wider MENU_ROUTES set above.
//
// restricted: true during worker onboarding (unverified worker on
// /worker/apply) - Home/Bookings/Alerts/Menu don't apply pre-verification,
// so this swaps in just Help (the existing Support/contact flow) and
// Logout, same component/position as everywhere else in the app.
export function BottomNav({ role, restricted }) {
  const tabs = role === 'worker' ? WORKER_TABS : CUSTOMER_TABS;
  const unreadCount = useUnreadNotificationCount();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const menuActive = MENU_ROUTES.some((route) => location.pathname.startsWith(route));

  if (restricted) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-raised shadow-raised lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-solid' : 'text-text-muted'
              }`
            }
          >
            <NavIcon name="help" />
            Help
          </NavLink>
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium text-text-muted transition-colors"
          >
            <NavIcon name="logout" />
            Logout
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-raised shadow-raised lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-solid' : 'text-text-muted'
              }`
            }
          >
            <NavIcon name={tab.icon} />
            {t(tab.labelKey)}
          </NavLink>
        ))}
        <NavLink
          to="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-solid' : 'text-text-muted'
            }`
          }
        >
          <span className="relative">
            <NavIcon name="bell" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {t('nav.alerts')}
        </NavLink>
        <Link
          to="/profile"
          aria-label="Menu"
          className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
            menuActive ? 'text-brand-solid' : 'text-text-muted'
          }`}
        >
          <NavIcon name="menu" />
          {t('nav.menu')}
        </Link>
      </div>
    </nav>
  );
}
