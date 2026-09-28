import { motion, useReducedMotion } from 'framer-motion';

// Gentle scroll-in reveal for landing-page sections (fade + upward slide
// as each one enters the viewport) - framer-motion's own `whileInView`
// already wraps an IntersectionObserver, so no separate scroll-jacking
// library is needed. `viewport={{ once: true }}` means a section never
// replays on scroll-up. `margin: '0px 0px -10% 0px'` shrinks the trigger
// zone's bottom edge so the animation starts a little after a section
// enters the viewport rather than the instant its first pixel appears -
// with a tall section and a fast scroll, triggering right at the edge
// made the reveal complete before the user had actually scrolled it into
// view, which read as "nothing happened". No bounce/elastic easing.
// Respects prefers-reduced-motion by skipping the animation entirely
// (renders already in its final state) rather than just shortening it.
export function Reveal({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
