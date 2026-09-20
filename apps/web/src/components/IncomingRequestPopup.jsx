import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Button } from './Button.jsx';
import * as bookingsApi from '../api/bookings.api.js';

const OFFER_TIMEOUT_SEC = 30;

// Mounted once at the app root (see App.jsx) so a worker sees an incoming
// instant request regardless of which screen they're on - not tied to
// Worker Jobs/Dashboard. A queue in case more than one offer lands close
// together; only the front of the queue is shown.
export function IncomingRequestPopup() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(OFFER_TIMEOUT_SEC);
  const [busy, setBusy] = useState(false);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (!socket || user?.role !== 'worker') return;

    function onNewOffer(payload) {
      setQueue((prev) => [...prev, payload]);
    }
    function onOfferResolved({ bookingId }) {
      setQueue((prev) => prev.filter((item) => item.booking.id !== bookingId));
    }

    socket.on('booking:new_offer', onNewOffer);
    socket.on('booking:offer_resolved', onOfferResolved);
    return () => {
      socket.off('booking:new_offer', onNewOffer);
      socket.off('booking:offer_resolved', onOfferResolved);
    };
  }, [socket, user?.role]);

  useEffect(() => {
    if (!current) return;
    setSecondsLeft(OFFER_TIMEOUT_SEC);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setQueue((prev) => prev.slice(1));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.offerId]);

  function dismissCurrent() {
    setQueue((prev) => prev.slice(1));
  }

  async function handleAccept() {
    if (!current || busy) return;
    setBusy(true);
    try {
      const { booking } = await bookingsApi.claim(current.booking.id);
      dismissCurrent();
      navigate(`/booking/${booking.id}`);
    } catch {
      // Someone else already claimed it - just dismiss, nothing to recover.
      dismissCurrent();
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!current || busy) return;
    setBusy(true);
    try {
      await bookingsApi.declineOffer(current.booking.id);
    } catch {
      // Already resolved one way or another - fine either way.
    } finally {
      setBusy(false);
      dismissCurrent();
    }
  }

  if (!current) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.div
        key={current.offerId}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-raised shadow-raised"
      >
        <div className="h-1 bg-surface-alt">
          <motion.div
            animate={{ width: `${(secondsLeft / OFFER_TIMEOUT_SEC) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className="h-full bg-brand"
          />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">New instant request</p>
            <span className="text-sm font-semibold text-brand-solid">{secondsLeft}s</span>
          </div>
          <p className="mt-2 text-sm capitalize text-text-muted">{current.booking.serviceName}</p>
          <p className="text-sm text-text-muted">{current.booking.addressLabel}</p>

          <div className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={handleDecline}>
              Decline
            </Button>
            <Button className="flex-1" disabled={busy} onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
