import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import { ReviewsList } from '../../components/ReviewsList.jsx';
import { AddServiceModal } from '../../components/AddServiceModal.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';
import { getCurrentLocation } from '../../lib/geolocation.js';

const SERVICE_STATUS_TONE = { pending: 'warning', rejected: 'danger' };

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="13" r="1.25" />
    </svg>
  );
}

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
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          isOnline ? 'bg-brand-solid' : 'bg-surface-alt'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-resting transition-transform ${
            isOnline ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </Card>
  );
}

// One-time post-approval moment - shown only when profile.welcomedAt is
// still null (see workers.model.js assignHandle/ackWelcome), never again
// after the worker dismisses it.
function WelcomeOverlay({ handle, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-surface-raised p-6 text-center shadow-raised"
      >
        <p className="text-2xl">🎉</p>
        <h2 className="mt-2 text-xl font-bold">You're verified!</h2>
        <p className="mt-2 text-sm text-text-muted">
          Welcome to Sajilo Bazar{handle ? `, ${handle}` : ''}. Customers can now find and book you -
          go online below whenever you're ready to take jobs.
        </p>
        <Button onClick={onDismiss} className="mt-5 w-full">
          Let's go
        </Button>
      </motion.div>
    </div>
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
  const [catalog, setCatalog] = useState([]);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then((result) => {
        setData(result);
        if (result.profile.verificationStatus === 'approved' && !result.profile.welcomedAt) {
          setShowWelcome(true);
        }
      })
      .finally(() => setLoading(false));
    bookingsApi
      .list()
      .then(({ bookings }) => setBookings(bookings))
      .catch(() => setBookings([]));
    workersApi
      .getServiceCatalog()
      .then(({ services }) => setCatalog(services))
      .catch(() => setCatalog([]));
  }, []);

  function handleServiceAdded(service) {
    setData((prev) => ({ ...prev, services: [...prev.services, service] }));
  }

  async function handleWelcomeDismiss() {
    setShowWelcome(false);
    try {
      const { profile } = await workersApi.ackWelcome();
      setData((prev) => ({ ...prev, profile }));
    } catch {
      // Non-critical - worst case the welcome shows again next load.
    }
  }

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
      {showWelcome && <WelcomeOverlay handle={data.profile.handle} onDismiss={handleWelcomeDismiss} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {data.profile.handle && <span className="text-sm text-text-muted">{data.profile.handle}</span>}
      </div>

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
          {data.profile.verificationStatus === 'rejected' && (
            <Button onClick={() => navigate('/worker/apply')} className="mt-3 w-full">
              Re-apply
            </Button>
          )}
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

          <Link to="/worker/earnings">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-brand px-5 py-3.5 text-text-onBrand shadow-resting"
            >
              <WalletIcon />
              <div>
                <p className="font-semibold">Earnings</p>
                <p className="text-sm opacity-90">See jobs, commission owed, and your balance</p>
              </div>
            </motion.div>
          </Link>

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
        <div className="flex items-center justify-between">
          <p className="font-semibold">Your services</p>
          <button onClick={() => setAddServiceOpen(true)} className="text-sm font-medium text-brand-solid">
            + Add service
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {data.services.map((service) => (
            <div key={service.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-text-muted">{service.serviceName}</span>
              <div className="flex shrink-0 items-center gap-2">
                {SERVICE_STATUS_TONE[service.approvalStatus] && (
                  <Badge tone={SERVICE_STATUS_TONE[service.approvalStatus]}>{service.approvalStatus}</Badge>
                )}
                <span className="font-medium">Rs. {service.price}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AddServiceModal
        open={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        catalog={catalog}
        existingServiceIds={data.services.map((s) => s.serviceId)}
        onAdded={handleServiceAdded}
      />

      {data.profile.verificationStatus === 'approved' && (
        <>
          <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Reviews
          </p>
          <ReviewsList reviews={data.reviews} reviewsCount={data.reviewsCount} />
        </>
      )}

      <Card className="mt-4">
        <p className="font-semibold">Submitted documents</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.documents.map((doc) => (
            <div key={doc.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted capitalize">{doc.docType}</span>
                <Badge tone={STATUS_COPY[doc.status]?.tone ?? 'neutral'}>{doc.status}</Badge>
              </div>
              {doc.status === 'rejected' && doc.reviewComment && (
                <p className="mt-0.5 text-xs text-text-muted">{doc.reviewComment}</p>
              )}
            </div>
          ))}
        </div>
        {data.profile.verificationStatus === 'rejected' && (
          <Button onClick={() => navigate('/worker/apply')} variant="secondary" className="mt-3 w-full">
            Re-apply with new documents
          </Button>
        )}
      </Card>
    </Screen>
  );
}
