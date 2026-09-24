import { motion } from 'framer-motion';

// Shared shell for the auth/onboarding flow only (Welcome, Login, Signup,
// worker-apply - the worker-apply steps are a direct continuation of
// signup, see postAuthRedirect.js). A full-bleed backdrop of soft blurred
// brand-color glows behind a centered glass/neumorphic card, styled after
// github.com/Nazia-99/Dark-Neumorphic-Login-Form-UI for layout and shadow
// treatment only - every color here is one of our own existing tokens
// (brand/surface), just used at low opacity for the glow/glass effect.
// Deliberately a separate component from Screen.jsx rather than a new
// Screen variant - Screen is shared by every other screen in the app and
// this restyle is scoped to auth/onboarding only.
export function AuthScreen({ children, className = '' }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-alt px-5 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-to opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-brand-from opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-brand-solid opacity-20 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-4xl items-center justify-center gap-12">
        {/* Decorative only - hidden below lg so the mobile layout (the
            primary target for this app) stays exactly the single centered
            card it always was. Not preloaded and lazy-loaded like any other
            below-the-fold image, since it's secondary to the form itself. */}
        <div className="hidden lg:block lg:w-[38%]">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2.5rem]">
            <div className="absolute inset-0 bg-brand" />
            <img
              src="/images/auth-illustration-800.webp"
              srcSet="/images/auth-illustration-400.webp 400w, /images/auth-illustration-800.webp 800w"
              sizes="400px"
              alt="A Sajilo Bazar worker on the way to a job"
              loading="lazy"
              className="auth-image-mask absolute inset-0 h-full w-full object-cover object-top"
            />
          </div>
        </div>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`auth-card relative flex w-full max-w-md flex-col rounded-3xl border border-glass-border bg-glass-surface p-8 shadow-neu-card backdrop-blur-xl ${className}`}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
