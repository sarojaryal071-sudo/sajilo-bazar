import { motion } from 'framer-motion';
import { Button } from './Button.jsx';

// Full-content view for an announcement, opened from either the
// Notifications inbox (tapping an 'announcement' notification) or the
// PromoBanner on Home/WorkerDashboard - the same two-line preview in both
// of those only ever shows a truncated body, so this is the one place the
// whole text is actually readable.
export function AnnouncementModal({ title, body, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-t-3xl bg-surface-raised p-6 shadow-raised sm:rounded-3xl"
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{body}</p>
        <Button onClick={onClose} className="mt-6 w-full">
          Close
        </Button>
      </motion.div>
    </div>
  );
}
