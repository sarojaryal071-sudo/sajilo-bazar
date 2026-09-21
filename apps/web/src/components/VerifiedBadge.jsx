import { Badge } from './Badge.jsx';

function ShieldCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1 3 5v6c0 5.25 3.75 9.94 9 11 5.25-1.06 9-5.75 9-11V5l-9-4Zm-1.4 15.3-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z" />
    </svg>
  );
}

// Only ever rendered when verificationStatus === 'approved' - callers own
// that check. No negative state for pending/rejected; the badge's absence
// is the signal, not a competing "not verified" label.
export function VerifiedBadge({ className = '' }) {
  return (
    <Badge tone="success" className={`gap-1 ${className}`}>
      <ShieldCheckIcon />
      Verified
    </Badge>
  );
}
