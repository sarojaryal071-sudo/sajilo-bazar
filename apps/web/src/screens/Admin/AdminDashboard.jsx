import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as adminApi from '../../api/admin.api.js';

function StatCard({ label, value, sublabel }) {
  return (
    <Card>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-text-muted">{sublabel}</p>}
    </Card>
  );
}

// Charts (target-spec Phase 7 - Dashboard rework) - hand-built plain SVG/
// CSS, no charting library in this app (see package.json). Colors come
// from tokens.css CSS variables, never a hex literal, so dark mode and any
// future brand change flow through automatically.

// Part-to-whole ratio, one thin rounded pill split into 2px-gapped
// segments (the gap is the container's own surface color showing through,
// not a border) + a legend row underneath that doubles as the direct-label
// requirement for >=2 series. `colors` maps segment key -> CSS color.
// `onSegmentClick` makes individual segments clickable (Performance tier
// split); omit it and wrap the whole Card in its own onClick instead
// (Rating distribution) - a chart never has both, to avoid two competing
// click targets on one card.
function StackedRatioBar({ segments, total, colors, onSegmentClick }) {
  const visible = segments.filter((s) => s.count > 0);
  if (total === 0 || visible.length === 0) {
    return <p className="mt-3 text-sm text-text-muted">Not enough data yet.</p>;
  }
  return (
    <div className="mt-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-alt">
        {visible.map((seg) => {
          const pct = (seg.count / total) * 100;
          const content = (
            <span
              className="block h-full"
              style={{ width: '100%', backgroundColor: colors[seg.key] }}
            />
          );
          const title = `${seg.label}: ${seg.count} (${Math.round(pct)}%)`;
          return onSegmentClick ? (
            <button
              key={seg.key}
              type="button"
              title={title}
              onClick={() => onSegmentClick(seg.key)}
              style={{ flexBasis: `${pct}%` }}
              className="h-full shrink-0 cursor-pointer border-0 bg-transparent p-0 transition-opacity hover:opacity-80"
            >
              {content}
            </button>
          ) : (
            <span key={seg.key} title={title} style={{ flexBasis: `${pct}%` }} className="h-full shrink-0">
              {content}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[seg.key] }} />
            <span className="text-text-muted">{seg.label}</span>
            <span className="font-medium">{total > 0 ? Math.round((seg.count / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Single ratio against its limit (100%) - a meter, not a bar chart (per
// the dataviz form guide: "a single ratio against a limit -> Meter").
function Meter({ pct, color }) {
  return (
    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-alt">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Three independent meters, one per flag reason - NOT a stacked bar,
// because a worker can carry more than one reason at once (the reasons
// aren't parts of a single whole that sums to 100%).
function ReasonMeters({ reasons, total, colors }) {
  if (total === 0) return <p className="mt-3 text-sm text-text-muted">Not enough data yet.</p>;
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {reasons.map((r) => {
        const pct = r.count / total;
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[r.key] }} />
                {r.label}
              </span>
              <span className="font-medium">
                {r.count} &middot; {Math.round(pct * 100)}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, pct * 100)}%`, backgroundColor: colors[r.key] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TREND_CUSTOMER_COLOR = 'var(--color-brand-solid)';
const TREND_WORKER_COLOR = 'var(--color-warning)';
const CHART_W = 600;
const CHART_H = 160;
const PAD = { top: 10, right: 10, bottom: 20, left: 10 };

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// 30-day line chart, 2 series (customer-initiated vs worker-initiated
// cancellations), with a hover crosshair + tooltip - the default
// interaction layer for any line chart per the dataviz skill.
function CancellationTrendLine({ points }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.customerCount, p.workerCount)));
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const n = points.length;

  const xFor = (i) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yFor = (v) => PAD.top + innerH - (v / maxValue) * innerH;

  const customerPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.customerCount)}`).join(' ');
  const workerPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.workerCount)}`).join(' ');

  const total = points.reduce((sum, p) => sum + p.customerCount + p.workerCount, 0);
  if (total === 0) {
    return <p className="mt-3 text-sm text-text-muted">No cancellations in the last 30 days.</p>;
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const ratio = n <= 1 ? 0 : (relX - PAD.left) / innerW;
    const idx = Math.round(Math.min(1, Math.max(0, ratio)) * (n - 1));
    setHoverIndex(idx);
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TREND_CUSTOMER_COLOR }} />
          Customer-initiated
        </span>
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TREND_WORKER_COLOR }} />
          Worker-initiated
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full touch-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={CHART_W - PAD.right}
          y2={PAD.top + innerH}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        <path d={customerPath} fill="none" stroke={TREND_CUSTOMER_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={workerPath} fill="none" stroke={TREND_WORKER_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <>
            <line
              x1={xFor(hoverIndex)}
              y1={PAD.top}
              x2={xFor(hoverIndex)}
              y2={PAD.top + innerH}
              stroke="var(--color-text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={xFor(hoverIndex)} cy={yFor(hovered.customerCount)} r="3.5" fill={TREND_CUSTOMER_COLOR} />
            <circle cx={xFor(hoverIndex)} cy={yFor(hovered.workerCount)} r="3.5" fill={TREND_WORKER_COLOR} />
          </>
        )}

        <text x={PAD.left} y={CHART_H - 4} fontSize="9" fill="var(--color-text-muted)">
          {formatShortDate(points[0].day)}
        </text>
        <text x={CHART_W - PAD.right} y={CHART_H - 4} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">
          {formatShortDate(points[n - 1].day)}
        </text>
      </svg>
      {hovered && (
        <div className="mt-1 flex items-center justify-between rounded-lg bg-surface-alt px-2.5 py-1.5 text-xs">
          <span className="font-medium">{formatShortDate(hovered.day)}</span>
          <span className="text-text-muted">
            Customer: <span className="font-medium text-text">{hovered.customerCount}</span> &middot; Worker:{' '}
            <span className="font-medium text-text">{hovered.workerCount}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// Ordinal worker-quality ramp (tokens.css) - Rating distribution uses all
// 4 steps; Performance tier split reuses 3 of the same 4 for visual
// consistency across the two "worker quality" cards, skipping the middle
// step to keep its 3 tiers maximally distinct.
const RATING_COLORS = {
  five_star: 'var(--color-chart-rating-4)',
  four_star: 'var(--color-chart-rating-3)',
  three_star: 'var(--color-chart-rating-2)',
  below_three_star: 'var(--color-chart-rating-1)',
};
const TIER_COLORS = {
  top_performer: 'var(--color-chart-rating-4)',
  standard: 'var(--color-chart-rating-3)',
  below_threshold: 'var(--color-chart-rating-1)',
};
// Fixed order validated with the dataviz skill's palette checker
// (adjacent-pair CVD + normal-vision floor both pass in this order; danger
// and warning sitting adjacent instead failed the normal-vision floor).
const FLAG_REASON_COLORS = {
  low_rating: 'var(--color-warning)',
  inactive: 'var(--color-brand-solid)',
  high_cancellation_rate: 'var(--color-danger)',
};

// Everything the Dashboard rework (target-spec Phase 7) asks for - five
// ratio/chart cards replacing Phase 1's five name-list cards, plus the
// existing payment breakdown (unchanged data, now clickable). Same
// "everyone with any admin role" access as Phase 1 - no department gate.
function InsightsSection() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getDashboardInsights()
      .then(setInsights)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="mt-8 text-sm text-danger">{error}</p>;
  if (!insights) return <p className="mt-8 text-sm text-text-muted">Loading insights...</p>;

  const { ratingDistribution, flaggedRate, performanceTierSplit, earningsConcentration, cancellationTrend, paymentBreakdown } =
    insights;

  function goToUsers(params) {
    navigate(`/admin/users?role=worker&${new URLSearchParams(params).toString()}`);
  }
  function goToBookings(params) {
    navigate(`/admin/bookings?${new URLSearchParams(params).toString()}`);
  }

  const flaggedPct = flaggedRate.total > 0 ? flaggedRate.flaggedCount / flaggedRate.total : 0;

  return (
    <>
      <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Insights</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          onClick={() => goToUsers({ sort: 'rating' })}
          className="cursor-pointer transition-colors hover:bg-surface-alt"
        >
          <p className="font-semibold">Rating distribution</p>
          <p className="text-xs text-text-muted">Share of active workers by star rating.</p>
          <StackedRatioBar segments={ratingDistribution.buckets} total={ratingDistribution.total} colors={RATING_COLORS} />
        </Card>

        <Card
          onClick={() => goToUsers({ flagged: 'true' })}
          className="cursor-pointer transition-colors hover:bg-surface-alt"
        >
          <p className="font-semibold">Flagged rate</p>
          <p className="text-xs text-text-muted">
            {flaggedRate.total > 0
              ? `${Math.round(flaggedPct * 100)}% of active workers currently flagged (${flaggedRate.flaggedCount} of ${flaggedRate.total})`
              : 'No active workers yet.'}
          </p>
          <ReasonMeters reasons={flaggedRate.byReason} total={flaggedRate.total} colors={FLAG_REASON_COLORS} />
        </Card>

        <Card>
          <p className="font-semibold">Performance tier split</p>
          <p className="text-xs text-text-muted">Trust-score tiers - rating, reliability, tenure and disputes combined.</p>
          <StackedRatioBar
            segments={performanceTierSplit.tiers}
            total={performanceTierSplit.total}
            colors={TIER_COLORS}
            onSegmentClick={(tier) => goToUsers({ tier })}
          />
        </Card>

        <Card
          onClick={() => goToUsers({ sort: 'earnings' })}
          className="cursor-pointer transition-colors hover:bg-surface-alt"
        >
          <p className="font-semibold">Earnings concentration</p>
          <p className="text-xs text-text-muted">Share of total platform earnings the top 10% of workers account for.</p>
          {earningsConcentration.grandTotal > 0 ? (
            <>
              <p className="mt-2 text-3xl font-bold">{Math.round(earningsConcentration.topDecileShare * 100)}%</p>
              <Meter pct={earningsConcentration.topDecileShare} color="var(--color-brand-solid)" />
              <p className="mt-1 text-xs text-text-muted">
                Rs. {Math.round(earningsConcentration.topDecileTotal)} of Rs. {Math.round(earningsConcentration.grandTotal)} total,
                across {earningsConcentration.workerCount} earning worker{earningsConcentration.workerCount === 1 ? '' : 's'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-text-muted">No completed jobs yet.</p>
          )}
        </Card>

        <Card
          onClick={() => goToBookings({ status: 'cancelled' })}
          className="cursor-pointer transition-colors hover:bg-surface-alt lg:col-span-2"
        >
          <p className="font-semibold">Cancellation trend - last 30 days</p>
          <p className="text-xs text-text-muted">By who cancelled, day by day.</p>
          <CancellationTrendLine points={cancellationTrend} />
        </Card>

        <Card>
          <p className="font-semibold">Payment method (completed bookings)</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {paymentBreakdown.byMethod.length === 0 && <p className="text-text-muted">No completed bookings yet.</p>}
            {paymentBreakdown.byMethod.map((row) => (
              <button
                key={row.method}
                type="button"
                onClick={() => goToBookings({ paymentMethod: row.method })}
                className="flex w-full items-center justify-between rounded-lg border-0 bg-transparent px-1.5 py-1 text-left transition-colors hover:bg-surface-alt"
              >
                <span className="capitalize text-text-muted">{row.method}</span>
                <span className="font-medium">
                  {row.count} &middot; Rs. {row.total}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="font-semibold">Payment status</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {paymentBreakdown.byStatus.length === 0 && <p className="text-text-muted">No bookings yet.</p>}
            {paymentBreakdown.byStatus.map((row) => (
              <button
                key={row.status}
                type="button"
                onClick={() => goToBookings({ paymentStatus: row.status })}
                className="flex w-full items-center justify-between rounded-lg border-0 bg-transparent px-1.5 py-1 text-left transition-colors hover:bg-surface-alt"
              >
                <span className="capitalize text-text-muted">{row.status}</span>
                <span className="font-medium">
                  {row.count} &middot; Rs. {row.total}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// Analytics (Round E/RBAC, 2026-09-27) - shown stacked below Overview on
// this same universal Dashboard page rather than its own nav item or a
// separate tab (Round G removed the tab toggle: neither section had enough
// content on its own to justify a click to switch). Everyone with any
// admin access sees Overview above; this section (and its endpoint) only
// renders/responds for a Super Admin - moving its location onto Dashboard
// didn't change its access control.
function AnalyticsSection() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Analytics</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!analytics && !error && <p className="text-sm text-text-muted">Loading...</p>}
      {analytics && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Commission this month" value={`Rs. ${analytics.commissionThisMonth}`} />
            <StatCard label="Commission last month" value={`Rs. ${analytics.commissionLastMonth}`} />
          </div>
          <Card>
            <p className="font-semibold">Bookings by status</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {analytics.bookingsByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span className="capitalize text-text-muted">{row.status}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="font-semibold">Users by role</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {analytics.usersByRole.map((row) => (
                <div key={row.role} className="flex items-center justify-between">
                  <span className="capitalize text-text-muted">{row.role}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!stats && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard
            label="Total workers"
            value={stats.totalWorkers}
            sublabel={`${stats.pendingVerificationCount} pending verification`}
          />
          <StatCard label="Total bookings" value={stats.totalBookings} />
          <StatCard label="Platform commission to date" value={`Rs. ${stats.totalCommission}`} />
        </div>
      )}

      <InsightsSection />

      {user.isSuperAdmin && <AnalyticsSection />}
    </div>
  );
}
