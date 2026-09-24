import { motion } from 'framer-motion';

// Radial wash centered on the card (this shell is flex-centered, so that's
// also the viewport's own center): strongest right behind the card so the
// glass surface floats on a consistent brand tone instead of whatever raw
// patch of photo happens to be there, fading to fully transparent toward
// the edges so the photo still reads as texture/mood out there. Same three
// brand tokens as bg-brand, just as explicit rgba stops - a CSS gradient
// can't reference the hex custom properties through color-mix() reliably
// across browsers yet.
const AUTH_OVERLAY = {
  background:
    'radial-gradient(ellipse 65% 55% at center, rgba(15,118,110,0.75) 0%, rgba(13,148,136,0.55) 40%, rgba(16,185,129,0.2) 70%, rgba(16,185,129,0) 100%)',
};

// Shared shell for the auth/onboarding flow only (Welcome, Login, Signup,
// worker-apply - the worker-apply steps are a direct continuation of
// signup, see postAuthRedirect.js). The auth illustration is the full-bleed
// background of the entire screen (not a boxed card beside the form) - a
// brand-gradient radial wash sits between it and the form so the card
// floats on consistent, legible color while the photo still shows at the
// edges as texture. Styled after github.com/Nazia-99/Dark-Neumorphic-
// Login-Form-UI for the card's own shadow treatment only. Deliberately a
// separate component from Screen.jsx rather than a new Screen variant -
// Screen is shared by every other screen in the app and this restyle is
// scoped to auth/onboarding only.
export function AuthScreen({ children, className = '' }) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <img
        src="/images/auth-illustration-800.webp"
        srcSet="/images/auth-illustration-400.webp 400w, /images/auth-illustration-800.webp 800w"
        sizes="100vw"
        alt="A Sajilo Bazar worker on the way to a job"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
      />
      <div className="pointer-events-none absolute inset-0" style={AUTH_OVERLAY} />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`auth-card relative z-10 flex w-full max-w-md flex-col rounded-3xl border border-glass-border bg-glass-surface p-8 shadow-neu-card backdrop-blur-xl ${className}`}
      >
        {children}
      </motion.main>
    </div>
  );
}
