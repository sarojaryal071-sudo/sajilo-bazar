// Muted stand-in for Avatar when a booking ended with no worker ever
// assigned (an unclaimed instant request that was cancelled, or a
// scheduled request that expired unanswered) - deliberately not the
// brand-colored circle Avatar falls back to, since that reads as "actively
// searching," which is no longer true once the booking is terminal.
export function NoWorkerAvatar({ size = 48 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-muted shadow-resting"
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" strokeLinecap="round" />
        <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
      </svg>
    </div>
  );
}
