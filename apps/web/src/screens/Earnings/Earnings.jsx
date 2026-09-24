import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { EarningsChart } from '../../components/EarningsChart.jsx';
import * as commissionLedgerApi from '../../api/commissionLedger.api.js';
import * as workersApi from '../../api/workers.api.js';
import { timeAgo } from '../../lib/timeAgo.js';

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: 'all', label: 'All' },
];

function formatDayLabel(period) {
  return new Date(period).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthLabel(period) {
  return new Date(period).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function Earnings() {
  const navigate = useNavigate();
  const [approved, setApproved] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const [range, setRange] = useState('30');
  const [series, setSeries] = useState(null);

  const [entries, setEntries] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then(({ profile }) => setApproved(profile.verificationStatus === 'approved'))
      .catch(() => setApproved(false));
    commissionLedgerApi.getMySummary().then(setSummary).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setSeries(null);
    commissionLedgerApi
      .getMySeries(range)
      .then(({ series }) => setSeries(series))
      .catch(() => setSeries([]));
  }, [range]);

  useEffect(() => {
    setHistoryLoading(true);
    commissionLedgerApi
      .getMyHistory(page)
      .then(({ entries: pageEntries, hasMore }) => {
        setEntries((prev) => (page === 1 ? pageEntries : [...(prev ?? []), ...pageEntries]));
        setHasMore(hasMore);
      })
      .catch((err) => setError(err.message))
      .finally(() => setHistoryLoading(false));
  }, [page]);

  if (approved === false) return <Navigate to="/worker/dashboard" replace />;

  if (error) {
    return (
      <Screen>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        <p className="text-sm text-danger">{error}</p>
      </Screen>
    );
  }

  if (!summary) return null;

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">Earnings</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="py-4">
          <p className="text-xs text-text-muted">Total lifetime earnings</p>
          <p className="mt-1 text-xl font-bold">Rs. {summary.totalEarned}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-text-muted">This month</p>
          <p className="mt-1 text-xl font-bold">Rs. {summary.thisMonthEarned}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-text-muted">Commission owed</p>
          <p className="mt-1 text-xl font-bold text-danger">Rs. {summary.commissionOwed}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-text-muted">Credit balance</p>
          <p className={`mt-1 text-xl font-bold ${summary.creditBalance < 0 ? 'text-danger' : 'text-success'}`}>
            Rs. {summary.creditBalance}
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Earnings over time</p>
          <div className="flex rounded-full bg-surface-alt p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  range === r.value ? 'bg-brand-solid text-text-onBrand' : 'text-text-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {series === null ? (
            <div style={{ height: 140 }} />
          ) : (
            <EarningsChart
              data={series}
              height={140}
              formatLabel={range === 'all' ? formatMonthLabel : formatDayLabel}
            />
          )}
        </div>
      </Card>

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Transaction history
      </p>
      {entries === null ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-muted">No completed jobs yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.serviceNames || `Job #${entry.bookingId}`}</p>
                  <p className="text-xs text-text-muted">
                    {entry.customerName ?? 'Customer'} &middot; {timeAgo(entry.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-text-muted">Rs. {entry.jobPrice}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-danger">-Rs. {entry.commissionAmount} commission</span>
                <span className="font-medium">Balance: Rs. {entry.creditBalanceAfter}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="secondary"
          disabled={historyLoading}
          onClick={() => setPage((p) => p + 1)}
          className="mt-3 w-full"
        >
          {historyLoading ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </Screen>
  );
}
