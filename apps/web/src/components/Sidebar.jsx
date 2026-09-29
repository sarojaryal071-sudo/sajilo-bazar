import { NavLink } from 'react-router-dom';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Wordmark } from './Wordmark.jsx';
import { NavIcon, CUSTOMER_TABS, WORKER_TABS } from './BottomNav.jsx';
import { EarningsIcon, ProfileIcon, SettingsIcon, LogoutIcon } from './NavIcons.jsx';

// Desktop-width (lg+, Piece C of the "Desktop scope..." round, 2026-09-27)
// replacement for BottomNav + HamburgerMenu - same destinations (role tabs,
// Alerts, Earnings for a worker, Profile, Settings, Log out) as a
// persistent left rail instead of a fixed bottom bar plus a slide-out
// overlay, since those are mobile navigation patterns that stop making
// sense once there's a whole sidebar's worth of width. Only rendered by
// AppShell (`lg:flex`, hidden below that) - BottomNav's own root carries
// the matching `lg:hidden` so the two never show at once.
function linkClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand text-text-onBrand' : 'text-text-muted hover:bg-surface-alt'
  }`;
}

export function Sidebar({ role, restricted }) {
  const tabs = role === 'worker' ? WORKER_TABS : CUSTOMER_TABS;
  const unreadCount = useUnreadNotificationCount();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const isWorker = role === 'worker';

  if (restricted) {
    return (
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface-raised px-4 py-6 lg:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavLink to="/help" className={linkClass}>
            <NavIcon name="help" />
            Help
          </NavLink>
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-surface-alt"
        >
          <LogoutIcon />
          Logout
        </button>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface-raised px-4 py-6 lg:flex">
      <div className="px-2">
        <Wordmark />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={linkClass}>
            <NavIcon name={tab.icon} />
            {t(tab.labelKey)}
          </NavLink>
        ))}
        <NavLink to="/notifications" className={linkClass}>
          <span className="relative">
            <NavIcon name="bell" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {t('nav.alerts')}
        </NavLink>

        <div className="my-3 border-t border-border" />

        {isWorker && (
          <NavLink to="/worker/earnings" className={linkClass}>
            <EarningsIcon />
            Earnings
          </NavLink>
        )}
        <NavLink to="/profile" className={linkClass}>
          <ProfileIcon />
          {t('menu.profile')}
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon />
          {t('menu.settings')}
        </NavLink>
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-surface-alt"
      >
        <LogoutIcon />
        {t('menu.logout')}
      </button>
    </aside>
  );
}
