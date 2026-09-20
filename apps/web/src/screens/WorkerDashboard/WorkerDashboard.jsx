import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';
import { getCurrentLocation } from '../../lib/geolocation.js';

function OnlineToggle({ isOnline, onToggle }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleChange() {
    setError('');
    setBusy(true);
    try {
      if (isOnline) {
        await onToggle({ isOnline: false });
      } else {
        const { latitude, longitude } = await getCurrentLocation();
        await onToggle({ isOnline: true, latitude, longitude });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold">{isOnline ? "You're online" : "You're offline"}</p>
        <p className="text-sm text-text-muted">
          {isOnline ? 'Visible for instant requests nearby.' : 'Go online to receive instant requests.'}
        </p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
      <button
        onClick={handleChange}
        disabled={busy}
        role="switch"
        aria-checked={isOnline}
        aria-label="Toggle online status"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          isOnline ? 'bg-brand-solid' : 'bg-surface-alt'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-resting transition-transform ${
            isOnline ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </Card>
  );
}

const STATUS_COPY = {
  pending: {
    tone: 'warning',
    title: 'Verification pending',
    body: "We're reviewing your documents. This usually takes 1-2 business days.",
  },
  approved: {
    tone: 'success',
    title: "You're verified!",
    body: 'Customers can now find and book you for the services below.',
  },
  rejected: {
    tone: 'danger',
    title: 'Verification rejected',
    body: 'Something needs a second look. Please reapply with clearer documents.',
  },
};

// "Today's jobs" has no scheduled-time field to filter on yet (see
// DATA_MODEL.md), so this reads it as "jobs actively in motion" - accepted
// or in_progress - rather than anything date-based.
const ACTIVE_STATUSES = ['accepted', 'in_progress'];

export function WorkerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then(setData)
      .finally(() => setLoading(false));
    bookingsApi
      .list()
      .then(({ bookings }) => setBookings(bookings))
      .catch(() => setBookings([]));
  }, []);

  if (loading) return null;
  if (!data) return null;
  if (data.profile.verificationStatus === 'unsubmitted') {
    return <Navigate to="/worker/apply" replace />;
  }

  const copy = STATUS_COPY[data.profile.verificationStatus];
  const activeJobs = bookings?.filter((b) => ACTIVE_STATUSES.includes(b.status)) ?? [];
  const pendingCount = bookings?.filter((b) => b.status === 'requested').length ?? 0;

  async function handleToggleOnline(input) {
    const { profile } = await workersApi.setOnline(input);
    setData((prev) => ({ ...prev, profile }));
  }

  return (
    <Screen fillHeight={false}>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">{copy.title}</p>
            <Badge tone={copy.tone}>{data.profile.verificationStatus}</Badge>
          </div>
          <p className="mt-2 text-sm text-text-muted">{copy.body}</p>
        </Card>
      </motion.div>

      {data.profile.verificationStatus === 'approved' && (
        <>
          <OnlineToggle isOnline={data.profile.isOnline} onToggle={handleToggleOnline} />

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card className="flex flex-col items-center py-4 text-center">
              <p className="text-xl font-bold">{data.profile.jobsCompletedCount}</p>
              <p className="text-xs text-text-muted">Completed</p>
            </Card>
            <Card className="flex flex-col items-center py-4 text-center">
              <p className="text-xl font-bold">{data.profile.ratingAvg.toFixed(1)}</p>
              <p className="text-xs text-text-muted">Rating</p>
            </Card>
            <Card className="flex flex-col items-center py-4 text-center">
              <p className="text-xl font-bold">{pendingCount}</p>
              <p className="text-xs text-text-muted">Pending</p>
            </Card>
          </div>

          <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Active jobs
          </p>
          {activeJobs.length === 0 ? (
            <p className="text-sm text-text-muted">No active jobs right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeJobs.map((booking) => (
                <BookingListItem
                  key={booking.id}
                  booking={booking}
                  viewerRole="worker"
                  onClick={() => navigate(`/booking/${booking.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Your services</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.services.map((service) => (
            <div key={service.id} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{service.serviceName}</span>
              <span className="font-medium">Rs. {service.price}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Submitted documents</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-sm">
              <span className="text-text-muted capitalize">{doc.docType}</span>
              <Badge tone={STATUS_COPY[doc.status]?.tone ?? 'neutral'}>{doc.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
