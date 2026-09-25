import { motion } from 'framer-motion';

function MegaphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8a4 4 0 0 1 0 8M18.5 5.5a8 8 0 0 1 0 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The latest live announcement targeted at this viewer's role, reusing the
// Announcements admin feature - no new content type, just a read-only
// surface for it. Shared between the customer Home screen and the worker
// Dashboard (see PROJECT_INDEX.md). Dismissing hides it for this session
// only (not persisted) - tapping the body instead opens the full text via
// onOpen, matching the same announcement surfaced in the Notifications
// inbox (see AnnouncementModal).
export function PromoBanner({ announcement, onDismiss, onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex items-start gap-3 rounded-2xl bg-brand px-4 py-3.5 text-text-onBrand shadow-resting"
    >
      <MegaphoneIcon />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="font-semibold">{announcement.title}</p>
        <p className="mt-0.5 truncate text-sm opacity-90">{announcement.body}</p>
      </button>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-80">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}
