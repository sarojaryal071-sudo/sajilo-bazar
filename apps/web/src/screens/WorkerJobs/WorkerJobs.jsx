import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import * as bookingsApi from '../../api/bookings.api.js';
import * as workersApi from '../../api/workers.api.js';

export function WorkerJobs() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(null);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then(({ profile }) => setApproved(profile.verificationStatus === 'approved'))
      .catch(() => setApproved(false));
    bookingsApi
      .list()
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message));
  }, []);

  // Only an approved worker can actually be booked, so there's nothing
  // useful here for a pending/rejected one - send them to the dashboard,
  // which already shows their application status.
  if (approved === false) return <Navigate to="/worker/dashboard" replace />;

  return (
    <Screen fillHeight={false}>
      <h1 className="text-2xl font-bold">Jobs</h1>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {bookings === null && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {bookings?.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">
          No jobs yet. Once a customer books you, incoming requests will show up here.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {bookings?.map((booking) => (
          <BookingListItem
            key={booking.id}
            booking={booking}
            viewerRole="worker"
            onClick={() => navigate(`/booking/${booking.id}`)}
          />
        ))}
      </div>
    </Screen>
  );
}
