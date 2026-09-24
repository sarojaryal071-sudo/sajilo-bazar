import { Card } from './Card.jsx';
import { Badge } from './Badge.jsx';

const TIER_LABEL = { building_trust: 'Building Trust', trusted: 'Trusted', highly_trusted: 'Highly Trusted' };
const TIER_TONE = { building_trust: 'neutral', trusted: 'success', highly_trusted: 'success' };

const FACTOR_LABEL = { rating: 'Rating', reliability: 'Reliability', tenure: 'Tenure', disputes: 'Dispute-free record' };
const FACTOR_WEIGHT = { rating: '40%', reliability: '30%', tenure: '15%', disputes: '15%' };

function FactorBar({ label, weight, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {label} <span className="text-text-muted/70">({weight})</span>
        </span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-alt">
        <div className="h-1.5 rounded-full bg-brand-solid" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// Worker's own full trust-score panel - the complete 0-100 meter, a
// per-factor breakdown, and actionable tips. Never shown to customers (see
// TrustBadge.jsx for the simplified tier-only version they see).
export function TrustMeter({ trustScore }) {
  if (!trustScore) return null;

  if (trustScore.inGracePeriod) {
    return (
      <Card className="mt-4">
        <p className="font-semibold">Trust score</p>
        <p className="mt-2 text-sm text-text-muted">
          You're still in your first 30 days as an approved worker - your trust score starts building after that.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Trust score</p>
        <Badge tone={TIER_TONE[trustScore.tier]}>{TIER_LABEL[trustScore.tier]}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2.5 rounded-full bg-surface-alt">
            <div className="h-2.5 rounded-full bg-brand-solid" style={{ width: `${trustScore.score}%` }} />
          </div>
        </div>
        <span className="text-lg font-bold">{trustScore.score}</span>
      </div>

      {trustScore.breakdown && (
        <div className="mt-4 flex flex-col gap-3">
          {Object.entries(trustScore.breakdown).map(([key, value]) => (
            <FactorBar key={key} label={FACTOR_LABEL[key]} weight={FACTOR_WEIGHT[key]} value={value} />
          ))}
        </div>
      )}

      {trustScore.tips?.length > 0 && (
        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
          {trustScore.tips.map((tip, i) => (
            <p key={i} className="text-xs text-text-muted">
              {tip}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
