import { NavLink } from 'react-router-dom';

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
  bookings: (
    <path d="M8 2v4M16 2v4M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
  ),
  profile: <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  dashboard: <path d="M4 4h7v7H4V4ZM13 4h7v4h-7V4ZM13 11h7v9h-7v-9ZM4 14h7v6H4v-6Z" />,
  jobs: (
    <path d="M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  ),
};

function NavIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <g strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</g>
    </svg>
  );
}

// No Search tab - search lives inside Home (the search bar at its top,
// tappable to enter search mode), not as a separate nav destination.
const CUSTOMER_TABS = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/bookings', icon: 'bookings', label: 'Bookings' },
  { to: '/profile', icon: 'profile', label: 'Profile' },
];

const WORKER_TABS = [
  { to: '/worker/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/worker/jobs', icon: 'jobs', label: 'Jobs' },
  { to: '/profile', icon: 'profile', label: 'Profile' },
];

export function BottomNav({ role }) {
  const tabs = role === 'worker' ? WORKER_TABS : CUSTOMER_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-raised shadow-raised">
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
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
