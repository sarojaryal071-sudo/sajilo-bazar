import { motion } from 'framer-motion';

// Desktop widths (2026-09-27, Piece C of the "Desktop scope..." round): the
// phone-width `max-w-md` column stays the mobile baseline for every screen,
// but now widens at `lg:` (matching useIsDesktop's 1024px breakpoint) so a
// desktop viewport doesn't just render the same narrow column stranded in
// the middle of the page with dead space on both sides. 'default' is a
// modest widen for detail/list/form screens; 'wide' is for grid-heavy
// screens (Home's category grid + search results) that can actually use
// the extra room for real multi-column layout, not just breathing room.
const MAX_WIDTH_CLASS = {
  default: 'max-w-md lg:max-w-2xl',
  wide: 'max-w-md lg:max-w-5xl',
};

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
export function Screen({ children, className = '', fillHeight = true, maxWidth = 'default' }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`mx-auto flex w-full ${MAX_WIDTH_CLASS[maxWidth]} flex-col px-5 py-8 ${
        fillHeight ? 'min-h-dvh' : 'flex-1'
      } ${className}`}
    >
      {children}
    </motion.main>
  );
}
