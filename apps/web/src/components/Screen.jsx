import { motion } from 'framer-motion';

// Shared page shell: mobile-first, centered column, consistent transition
// used by every screen so navigating between them feels like one app.
export function Screen({ children, className = '' }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8 ${className}`}
    >
      {children}
    </motion.main>
  );
}
