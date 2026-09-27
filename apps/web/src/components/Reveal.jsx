import { motion, useReducedMotion } from 'framer-motion';

// Gentle scroll-in reveal for landing-page sections (fade + slight upward
// slide as each one enters the viewport) - framer-motion's own
// `whileInView` already wraps an IntersectionObserver, so no separate
// scroll-jacking library is needed. `viewport={{ once: true }}` means a
// section never replays on scroll-up. Short duration, no bounce/elastic
// easing, kept subtle on purpose. Respects prefers-reduced-motion by
// skipping the animation entirely (renders already in its final state)
// rather than just shortening it.
export function Reveal({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
