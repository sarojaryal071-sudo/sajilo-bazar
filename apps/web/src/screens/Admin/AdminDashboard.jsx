import { useEffect, useState } from 'react';
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

// Analytics (Round E/RBAC, 2026-09-27) - a tab on this same universal
// Dashboard page rather than its own nav item. Everyone with any admin
// access sees the Overview tab above; this tab (and its endpoint) only
// renders/responds for a Super Admin - moving its location onto Dashboard
// didn't change its access control.
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="mt-4 text-sm text-danger">{error}</p>;
  if (!analytics) return <p className="mt-4 text-sm text-text-muted">Loading...</p>;

  return (
    <div className="mt-4 flex flex-col gap-4">
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
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {user.isSuperAdmin && (
          <div className="flex gap-1 rounded-full bg-surface-alt p-1">
            <button
              onClick={() => setTab('overview')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'overview' ? 'bg-brand text-text-onBrand' : 'text-text-muted'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab('analytics')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'analytics' ? 'bg-brand text-text-onBrand' : 'text-text-muted'
              }`}
            >
              Analytics
            </button>
          </div>
        )}
      </div>

      {tab === 'overview' ? (
        <>
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
        </>
      ) : (
        <AnalyticsTab />
      )}
    </div>
  );
}
