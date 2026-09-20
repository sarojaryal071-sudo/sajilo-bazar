import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import * as workersApi from '../../api/workers.api.js';
import * as bookingsApi from '../../api/bookings.api.js';

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
