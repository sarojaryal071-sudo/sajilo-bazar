import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import { ReviewsList } from '../../components/ReviewsList.jsx';
import { AddServiceModal } from '../../components/AddServiceModal.jsx';
import { EarningsChart } from '../../components/EarningsChart.jsx';
import { SkeletonBlock } from '../../components/Skeleton.jsx';
import { PromotionCarousel } from '../../components/PromotionCarousel.jsx';
import { useIsDesktop } from '../../hooks/useIsDesktop.js';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';
import * as commissionLedgerApi from '../../api/commissionLedger.api.js';
import * as publicationsApi from '../../api/publications.api.js';
import { getCurrentLocation, getGeolocationPermissionState, getLocationBlockedMessage } from '../../lib/geolocation.js';
import { WORKER_DESKTOP_BLOCK_MESSAGE } from '../../lib/workerDesktopBlock.js';

const SERVICE_STATUS_TONE = { pending: 'warning', rejected: 'danger' };

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A rejected service (from the cross-category review flow) shows the
// admin's reason and lets the worker resubmit right there, same
// reason-shown/can-retry pattern verification documents already use.
// Resubmitting reuses POST /workers/me/services - it's idempotent on
// (worker_id, service_id), so this just re-adds the same service, which
// resets its approval state server-side (see workers.model.js addWorkerService).
function ServiceRow({ service, onRetried }) {
  const [retrying, setRetrying] = useState(false);
  const [price, setPrice] = useState(String(service.price));
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRetry(e) {
    e.preventDefault();
    setError('');
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return setError('Enter a valid price.');
    if (service.highRisk && !document) return setError('A supporting document is required.');

    setSubmitting(true);
    try {
      const { service: updated } = await workersApi.addService({
        serviceId: service.serviceId,
        price: priceNum,
        document,
      });
      onRetried(updated);
      setRetrying(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-text-muted">{service.serviceName}</span>
        <div className="flex shrink-0 items-center gap-2">
          {SERVICE_STATUS_TONE[service.approvalStatus] && (
            <Badge tone={SERVICE_STATUS_TONE[service.approvalStatus]}>{service.approvalStatus}</Badge>
          )}
          <span className="font-medium">Rs. {service.price}</span>
        </div>
      </div>
      {service.approvalStatus === 'rejected' && (
        <>
          {service.reviewComment && <p className="mt-0.5 text-xs text-text-muted">{service.reviewComment}</p>}
          {!retrying ? (
            <button
              type="button"
              onClick={() => setRetrying(true)}
              className="mt-1 text-xs font-medium text-brand-solid"
            >
              Retry
            </button>
          ) : (
            <form onSubmit={handleRetry} className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-alt p-3">
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price (Rs.)"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
              />
              {service.highRisk && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-muted">Supporting document (required)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                </label>
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setRetrying(false)}
                  className="flex-1 px-3 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 px-3 py-1.5 text-xs">
                  {submitting ? 'Resubmitting...' : 'Resubmit'}
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

// Compact snapshot on the Dashboard - a 7-day sparkline plus this week's
// total and jobs-completed count, tapping through to the full Earnings
// screen (see docs/SCREENS.md Phase 5). Deliberately small: it sits
// alongside the existing today's-jobs/quick-stats content, not in place
// of it.
function EarningsCard({ summary, sparkline, onClick }) {
  return (
    <Card whileTap={{ scale: 0.98 }} onClick={onClick} className="mt-4 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-muted">This week</p>
          <p className="mt-0.5 text-2xl font-bold">Rs. {summary.thisWeekEarned}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {summary.thisWeekJobsCompleted} job{summary.thisWeekJobsCompleted === 1 ? '' : 's'} completed
          </p>
        </div>
        <div className="w-20 shrink-0">
          <EarningsChart data={sparkline} height={44} compact />
        </div>
        <ChevronIcon />
      </div>
    </Card>
  );
}

function OnlineToggle({ isOnline, onToggle }) {
  const isDesktop = useIsDesktop();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleChange() {
    if (isDesktop) {
      setError(WORKER_DESKTOP_BLOCK_MESSAGE);
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (isOnline) {
        await onToggle({ isOnline: false });
      } else {
        // 'denied' means the browser will never show its own prompt again -
        // asking anyway would just silently fail the same way every time,
        // so short-circuit straight to actionable instructions instead.
        // 'prompt' (or 'unknown', for browsers without the Permissions API)
        // falls through to getCurrentLocation, which is what actually
        // triggers the native permission popup.
        const permissionState = await getGeolocationPermissionState();
        if (permissionState === 'denied') {
          setError(getLocationBlockedMessage());
          return;
        }
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
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [sparkline, setSparkline] = useState(null);
  const [promotions, setPromotions] = useState([]);

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
    commissionLedgerApi.getMySummary().then(setEarningsSummary).catch(() => {});
    commissionLedgerApi
      .getMySparkline()
      .then(({ sparkline }) => setSparkline(sparkline))
      .catch(() => {});
    publicationsApi
      .getActivePromotions('workers')
      .then(({ promotions }) => setPromotions(promotions))
      .catch(() => {});
  }, []);

  // Upserts by id rather than always appending - a retry on a rejected
  // service returns the same row (updated), not a new one (see
  // workers.model.js addWorkerService's ON CONFLICT).
  function handleServiceUpdated(service) {
    setData((prev) => {
      const exists = prev.services.some((s) => s.id === service.id);
      return {
        ...prev,
        services: exists
          ? prev.services.map((s) => (s.id === service.id ? service : s))
          : [...prev.services, service],
      };
    });
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

  if (loading || !data) {
    return (
      <Screen fillHeight={false}>
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-8 w-14 rounded-full" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <SkeletonBlock className="h-16 rounded-2xl" />
          <SkeletonBlock className="h-16 rounded-2xl" />
          <SkeletonBlock className="h-16 rounded-2xl" />
        </div>
        <SkeletonBlock className="mt-4 h-28 w-full rounded-2xl" />
        <SkeletonBlock className="mt-3 h-20 w-full rounded-2xl" />
        <SkeletonBlock className="mt-3 h-20 w-full rounded-2xl" />
      </Screen>
    );
  }
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

      <PromotionCarousel promotions={promotions} />

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

          <button
            onClick={() => navigate('/worker/availability')}
            className="mt-2 self-start text-sm font-medium text-brand-solid"
          >
            Manage availability &rarr;
          </button>

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

          {earningsSummary && sparkline && (
            <EarningsCard
              summary={earningsSummary}
              sparkline={sparkline}
              onClick={() => navigate('/worker/earnings')}
            />
          )}

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
        <div className="mt-3 flex flex-col gap-3">
          {data.services.map((service) => (
            <ServiceRow key={service.id} service={service} onRetried={handleServiceUpdated} />
          ))}
        </div>
      </Card>

      <AddServiceModal
        open={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        catalog={catalog}
        existingServiceIds={data.services.map((s) => s.serviceId)}
        approvedCategories={[
          ...new Set(data.services.filter((s) => s.approvalStatus === 'approved').map((s) => s.category)),
        ]}
        onAdded={handleServiceUpdated}
      />

      {data.profile.verificationStatus === 'approved' && (
        <>
          <p className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Reviews
          </p>
          <ReviewsList reviews={data.reviews} reviewsCount={data.reviewsCount} />
        </>
      )}

    </Screen>
  );
}
