import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import * as commissionLedgerApi from '../../api/commissionLedger.api.js';
import { timeAgo } from '../../lib/timeAgo.js';

export function Earnings() {
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    commissionLedgerApi
      .getMyLedger()
      .then(setLedger)
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

      <Card className="mt-4">
        <p className="text-sm text-text-muted">Running balance</p>
        <p className={`mt-1 text-3xl font-bold ${ledger.balance < 0 ? 'text-danger' : 'text-success'}`}>
          Rs. {ledger.balance}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {ledger.balance < 0
            ? 'Negative balance is commission owed to Sajilo Bazar. Payment collection is manual for now.'
            : "You're all settled up."}
        </p>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center py-4 text-center">
          <p className="text-lg font-bold">Rs. {ledger.totalEarned}</p>
          <p className="text-xs text-text-muted">Total earned</p>
        </Card>
        <Card className="flex flex-col items-center py-4 text-center">
          <p className="text-lg font-bold text-danger">Rs. {ledger.commissionOwed}</p>
          <p className="text-xs text-text-muted">Commission owed</p>
        </Card>
        <Card className="flex flex-col items-center py-4 text-center">
          <p className="text-lg font-bold text-success">Rs. {ledger.commissionPaid}</p>
          <p className="text-xs text-text-muted">Commission paid</p>
        </Card>
      </div>

      <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Transaction history
      </p>
      {ledger.entries.length === 0 ? (
        <p className="text-sm text-text-muted">No completed jobs yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ledger.entries.map((entry) => (
            <Card key={entry.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.serviceNames || `Job #${entry.bookingId}`}</p>
                  <p className="text-xs text-text-muted">{timeAgo(entry.createdAt)}</p>
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
    </Screen>
  );
}
