import { motion } from 'framer-motion';
import { AuthBackdrop } from './AuthBackdrop.jsx';
import { Wordmark } from './Wordmark.jsx';
import { Link, useNavigate } from 'react-router-dom';

// Shared shell for the auth flow (Welcome, Login, Signup, ForgotPassword) -
// see WorkerApply.jsx for the onboarding flow's own use of the same
// AuthBackdrop. The auth illustration is the full-bleed background of the
// entire screen (not a boxed card beside the form) - a brand-gradient
// radial wash sits between it and the form so the card floats on
// consistent, legible color while the photo still shows at the edges as
// texture. Styled after github.com/Nazia-99/Dark-Neumorphic-Login-Form-UI
// for the card's own shadow treatment only. Deliberately a separate
// component from Screen.jsx rather than a new Screen variant - Screen is
// shared by every other screen in the app and this restyle is scoped to
// auth only.
export function AuthScreen({ children, className = '' }) {
  const navigate = useNavigate();
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <AuthBackdrop />

      {/* Always navigates to "/" directly (not browser history) - this
          screen can be the very first thing a user sees with no prior
          history to go back through, e.g. opening the site as an
          installed home-screen app (PWA), which has no browser chrome
          (no address bar, no back button) to fall back on. Fixed so it
          stays reachable regardless of how tall the card's own content
          gets; the glass-card tokens (bg-glass-surface/border-glass-border
          + backdrop-blur) match the card itself so it reads clearly
          against the full-bleed backdrop photo behind it. */}
      <Link
        to="/"
        className="fixed left-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-surface px-4 py-2 text-sm font-medium text-text shadow-resting backdrop-blur-xl transition-colors hover:bg-surface-alt sm:left-6 sm:top-6"
      >
        &larr; Back to home
      </Link>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`auth-card relative z-10 flex w-full max-w-md flex-col rounded-3xl border border-glass-border bg-glass-surface p-8 shadow-neu-card backdrop-blur-xl ${className}`}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Sajilo Bazar home"
          className="mx-auto mb-6"
        >
          <Wordmark />
        </button>
        {children}
      </motion.main>
    </div>
  );
}
