import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as commissionLedgerApi from '../../api/commissionLedger.api.js';
import { timeAgo } from '../../lib/timeAgo.js';

export function Earnings() {
  const navigate = useNavigate();
  const [jobsCompletedCount, setJobsCompletedCount] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([workersApi.getMyWorkerData(), commissionLedgerApi.getMyLedger()])
      .then(([data, ledgerData]) => {
        setJobsCompletedCount(data.profile.jobsCompletedCount);
        setLedger(ledgerData);
      })
      .catch((err) => setError(err.message));
  }, []);

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

  if (!ledger) return null;

  return (
    <Screen>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">Earnings</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center py-4 text-center">
          <p className="text-xl font-bold">{jobsCompletedCount}</p>
          <p className="text-xs text-text-muted">Jobs completed</p>
        </Card>
        <Card className="flex flex-col items-center py-4 text-center">
          <p className="text-xl font-bold text-danger">Rs. {ledger.commissionOwed}</p>
          <p className="text-xs text-text-muted">Commission owed</p>
        </Card>
      </div>

      <Card className="mt-3">
        <p className="text-sm text-text-muted">Running balance</p>
        <p className={`mt-1 text-2xl font-bold ${ledger.balance < 0 ? 'text-danger' : 'text-success'}`}>
          Rs. {ledger.balance}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {ledger.balance < 0
            ? 'Negative balance is commission owed to Sajilo Bazar. Payment collection is manual for now.'
            : "You're all settled up."}
        </p>
      </Card>

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Ledger history
      </p>
      {ledger.entries.length === 0 ? (
        <p className="text-sm text-text-muted">No completed jobs yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ledger.entries.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">Job #{entry.bookingId}</p>
                <p className="text-xs text-text-muted">{timeAgo(entry.createdAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm text-text-muted">Job: Rs. {entry.jobPrice}</p>
                <p className="text-sm font-medium text-danger">-Rs. {entry.commissionAmount}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}
