import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
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

const FLAG_REASON_LABEL = {
  high_cancellation_rate: 'High cancellation rate',
  low_rating: 'Low rating',
  inactive: 'Inactive',
};

function RankedWorkerRow({ rank, fullName, profileImageUrl, primary, secondary }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 shrink-0 text-sm font-semibold text-text-muted">{rank}</span>
      <Avatar name={fullName} imageUrl={profileImageUrl} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fullName}</p>
        {secondary && <p className="text-xs text-text-muted">{secondary}</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold">{primary}</span>
    </div>
  );
}

// Everything the target spec's Phase 1 asked for - ranked lists, flagged/
// top-performer sections, payment breakdown - stacked on the same
// universal Dashboard page below Overview, same as Analytics. Visible to
// every admin with any dashboard access (no department gate on this data,
// matching /dashboard/stats above).
function InsightsSection() {
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

  const { topEarningWorkers, topRatedWorkers, recentLowRatings, cancellationStats, flaggedWorkers, topPerformers, paymentBreakdown } =
    insights;

  return (
    <>
      <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Insights</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="font-semibold">Payment method (completed bookings)</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {paymentBreakdown.byMethod.length === 0 && <p className="text-text-muted">No completed bookings yet.</p>}
            {paymentBreakdown.byMethod.map((row) => (
              <div key={row.method} className="flex items-center justify-between">
                <span className="capitalize text-text-muted">{row.method}</span>
                <span className="font-medium">
                  {row.count} &middot; Rs. {row.total}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="font-semibold">Payment status</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {paymentBreakdown.byStatus.length === 0 && <p className="text-text-muted">No bookings yet.</p>}
            {paymentBreakdown.byStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between">
                <span className="capitalize text-text-muted">{row.status}</span>
                <span className="font-medium">
                  {row.count} &middot; Rs. {row.total}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="font-semibold">Top earning workers</p>
          {topEarningWorkers.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No completed jobs yet.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border">
              {topEarningWorkers.map((w, i) => (
                <RankedWorkerRow
                  key={w.workerId}
                  rank={i + 1}
                  fullName={w.fullName}
                  profileImageUrl={w.profileImageUrl}
                  primary={`Rs. ${w.totalEarnings}`}
                  secondary={`${w.completedJobs} completed job${w.completedJobs === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="font-semibold">Top rated workers</p>
          {topRatedWorkers.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No reviews yet.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border">
              {topRatedWorkers.map((w, i) => (
                <RankedWorkerRow
                  key={w.workerId}
                  rank={i + 1}
                  fullName={w.fullName}
                  profileImageUrl={w.profileImageUrl}
                  primary={`${w.ratingAvg.toFixed(1)} ★`}
                  secondary={`${w.reviewsCount} review${w.reviewsCount === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="font-semibold">Top performers</p>
          <p className="text-xs text-text-muted">Trust-based ranking - rating, reliability, tenure and disputes combined.</p>
          {topPerformers.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No workers with an established trust score yet.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border">
              {topPerformers.map((w, i) => (
                <RankedWorkerRow
                  key={w.workerId}
                  rank={i + 1}
                  fullName={w.fullName}
                  profileImageUrl={w.profileImageUrl}
                  primary={`${Math.round(w.trustScore)}`}
                  secondary={`${w.ratingAvg.toFixed(1)} ★ · ${w.jobsCompletedCount} jobs`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="font-semibold">Cancellations</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total cancelled</span>
              <span className="font-medium">{cancellationStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">By customer</span>
              <span className="font-medium">{cancellationStats.byInitiator.customer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">By worker</span>
              <span className="font-medium">{cancellationStats.byInitiator.worker}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Other / admin</span>
              <span className="font-medium">{cancellationStats.byInitiator.other}</span>
            </div>
          </div>
        </Card>

        <Card>
          <p className="font-semibold">Flagged workers</p>
          {flaggedWorkers.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No workers currently flagged.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border">
              {flaggedWorkers.map((w) => (
                <div key={w.workerId} className="flex items-center gap-3 py-2">
                  <Avatar name={w.fullName} imageUrl={w.profileImageUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w.reasons.map((reason) => (
                        <Badge key={reason} tone="warning">
                          {FLAG_REASON_LABEL[reason] || reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="font-semibold">Recent low ratings</p>
          {recentLowRatings.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No low ratings recently.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border">
              {recentLowRatings.map((r) => (
                <div key={r.reviewId} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {r.rating} ★ {r.workerName || 'Unassigned worker'}
                    </span>
                    <span className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-text-muted">From {r.customerName}</p>
                  {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
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
