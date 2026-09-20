import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { BookingListItem } from '../../components/BookingListItem.jsx';
import * as bookingsApi from '../../api/bookings.api.js';

export function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingsApi
      .list()
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Screen fillHeight={false}>
      <h1 className="text-2xl font-bold">Bookings</h1>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {bookings === null && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}
      {bookings?.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">
          You haven&apos;t booked anyone yet. Find a worker from Home to get started.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {bookings?.map((booking) => (
          <BookingListItem
            key={booking.id}
            booking={booking}
            viewerRole="customer"
            onClick={() => navigate(`/booking/${booking.id}`)}
          />
        ))}
      </div>
    </Screen>
  );
}
