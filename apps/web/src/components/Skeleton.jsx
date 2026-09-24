// Shared pulsing block - the one primitive every screen's loading state is
// built from, so every skeleton uses the same animation/palette instead of
// a blank/black screen while data is still fetching. Uses --color-border
// rather than --color-surface-alt: surface-alt is a near-white background
// tint (barely distinguishable from --color-surface, the page background
// underneath it), while border is the design system's actual visible-grey
// token - the only one with enough contrast to read as a placeholder block.
export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-border ${className}`} />;
}

export function Spinner({ size = 28, className = '' }) {
  return (
    <svg
      className={`animate-spin text-brand-solid ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Full-viewport centered spinner - for the app-level auth gates
// (ProtectedRoute, AppShell, AdminShell, Welcome) where loading happens
// before any destination screen - and therefore its content shape - is
// even known, so there's no layout to mimic with a skeleton.
export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size={32} />
    </div>
  );
}
