import { motion } from 'framer-motion';

// Shared page shell: mobile-first, centered column, consistent transition
// used by every screen so navigating between them feels like one app.
//
// fillHeight (default true): guarantees the screen is at least one viewport
// tall, for screens that own the full page on their own (Login, Signup,
// Welcome, ...). Screens rendered inside AppShell pass fillHeight={false}
// and grow via flex-1 into the height AppShell's wrapper already owns,
// instead of independently re-claiming min-h-dvh on top of it - that
// double claim (AppShell's nav-clearance padding added beyond an already
// full-viewport-tall Screen) is what produced dead scrollable space below
// the real content. Only one element should ever own that height; the
// other just fills whatever it's given.
export function Screen({ children, className = '', fillHeight = true }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`mx-auto flex w-full max-w-md flex-col px-5 py-8 ${
        fillHeight ? 'min-h-dvh' : 'flex-1'
      } ${className}`}
    >
      {children}
    </motion.main>
  );
}
