import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EarningsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5.7 2.5 2c0 3-5 1.5-5 4.5 0 1.3 1.1 2 2.5 2s2.5-1.1 2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HamburgerMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const isWorker = user?.role === 'worker';

  function go(to) {
    onClose();
    navigate(to);
  }

  function handleLogout() {
    onClose();
    logout();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            role="dialog"
            aria-label={t('menu.title')}
            className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80%] flex-col bg-surface-raised shadow-raised"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="font-semibold">{t('menu.title')}</p>
              <button onClick={onClose} aria-label="Close menu" className="text-text-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <button
                onClick={() => go(isWorker ? '/worker/dashboard' : '/home')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <DashboardIcon />
                <span className="flex-1">{t('nav.dashboard')}</span>
              </button>
              <button
                onClick={() => go(isWorker ? '/worker/jobs' : '/bookings')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <BookingsIcon />
                <span className="flex-1">{t('nav.bookings')}</span>
              </button>
              {isWorker && (
                <button
                  onClick={() => go('/worker/earnings')}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
                >
                  <EarningsIcon />
                  <span className="flex-1">Earnings</span>
                </button>
              )}
              <button
                onClick={() => go('/profile')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <ProfileIcon />
                <span className="flex-1">{t('menu.profile')}</span>
              </button>
              <button
                onClick={() => go('/settings')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <SettingsIcon />
                <span className="flex-1">{t('menu.settings')}</span>
              </button>
            </div>

            <div className="border-t border-border p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-danger hover:bg-surface-alt"
              >
                <LogoutIcon />
                {t('menu.logout')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
