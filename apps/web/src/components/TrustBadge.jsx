// Customer-facing trust tier only - a simplified badge + a 3-segment
// visual meter. Never shows the raw score, a per-factor breakdown, or any
// dispute count (that's the worker's own panel - see TrustMeter.jsx).
const TIER_COPY = {
  building_trust: { label: 'Building Trust', tone: 'neutral', filledSegments: 1 },
  trusted: { label: 'Trusted', tone: 'brand', filledSegments: 2 },
  highly_trusted: { label: 'Highly Trusted', tone: 'success', filledSegments: 3 },
};

const SEGMENT_FILL_CLASS = {
  neutral: 'bg-text-muted',
  brand: 'bg-brand-solid',
  success: 'bg-success',
};

const BADGE_CLASS = {
  neutral: 'bg-surface-alt text-text-muted',
  brand: 'bg-brand-solid/10 text-brand-solid',
  success: 'bg-success/10 text-success',
};

export function TrustBadge({ tier, className = '' }) {
  const copy = TIER_COPY[tier];
  if (!copy) return null;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[copy.tone]} ${className}`}>
      {copy.label}
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 w-2.5 rounded-full ${
              segment <= copy.filledSegments ? SEGMENT_FILL_CLASS[copy.tone] : 'bg-current opacity-20'
            }`}
          />
        ))}
      </span>
    </span>
  );
}
