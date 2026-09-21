import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
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

export function AdminDashboard() {
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
    </div>
  );
}
