import { motion } from 'framer-motion';

export function Card({ className = '', children, whileTap, ...props }) {
  return (
    <motion.div
      whileTap={whileTap}
      className={`rounded-2xl bg-surface-raised p-5 shadow-resting ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
