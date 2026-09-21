import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

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

function LanguageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeIcon({ dark }) {
  return dark ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-7.54-7.54A9 9 0 0 0 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9.5 9a2.5 2.5 0 1 1 3.4 2.33c-.7.28-1.4.9-1.4 1.67v.5M12 17h.01"
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
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

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
                <span className="text-xs text-text-muted">{t('menu.soon')}</span>
              </button>

              {/* Instant-apply on tap - no separate page, unlike the rest of
                  this list. Each is a single row that cycles its own value
                  and updates the app immediately. */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <LanguageIcon />
                <span className="flex-1">{t('menu.language')}</span>
                <span className="text-xs text-text-muted">
                  {language === 'en' ? t('menu.english') : t('menu.nepali')}
                </span>
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <ThemeIcon dark={theme === 'dark'} />
                <span className="flex-1">{t('menu.theme')}</span>
                <span className="text-xs text-text-muted">
                  {theme === 'dark' ? t('menu.dark') : t('menu.light')}
                </span>
              </button>

              <button
                onClick={() => go('/help')}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-surface-alt"
              >
                <HelpIcon />
                <span className="flex-1">{t('menu.help')}</span>
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
