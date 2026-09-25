import { motion } from 'framer-motion';

const VARIANTS = {
  primary:
    'bg-brand text-text-onBrand shadow-resting hover:shadow-raised disabled:opacity-50',
  secondary:
    'bg-surface-raised text-text border border-border shadow-resting hover:shadow-raised disabled:opacity-50',
  ghost: 'text-text hover:bg-surface-alt disabled:opacity-50',
  danger: 'bg-danger text-white shadow-resting hover:shadow-raised disabled:opacity-50',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-shadow ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
