import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button.jsx';
import { Input } from './Input.jsx';
import { Badge } from './Badge.jsx';
import * as addressesApi from '../api/addresses.api.js';
import { getCurrentLocation, getGeolocationPermissionState, getLocationBlockedMessage } from '../lib/geolocation.js';

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Uber-style location picker, used at booking time (manual and instant):
// default Home location, any other saved address, or a fresh one-off
// address just for this booking. Saved addresses already carry lat/lng;
// a one-off entry can optionally attach the browser's current position via
// "Use my current location", same capture the instant flow used to do
// unconditionally on every submit.
export function AddressPicker({ value, onChange }) {
  const [addresses, setAddresses] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [oneOffMode, setOneOffMode] = useState(false);
  const [oneOffText, setOneOffText] = useState('');
  const [oneOffCoords, setOneOffCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  useEffect(() => {
    addressesApi
      .list()
      .then(({ addresses }) => {
        setAddresses(addresses);
        if (!value) {
          const defaultAddress = addresses.find((a) => a.isDefault);
          if (defaultAddress) onChange(fromSaved(defaultAddress));
        }
      })
      .catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fromSaved(address) {
    return {
      addressLabel: address.addressLabel,
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  function openSheet() {
    setOneOffMode(false);
    setOneOffText('');
    setOneOffCoords(null);
    setLocateError('');
    setSheetOpen(true);
  }

  function selectSaved(address) {
    onChange(fromSaved(address));
    setSheetOpen(false);
  }

  async function handleUseCurrentLocation() {
    setLocateError('');
    setLocating(true);
    try {
      const permissionState = await getGeolocationPermissionState();
      if (permissionState === 'denied') {
        setLocateError(getLocationBlockedMessage());
        return;
      }
      const { latitude, longitude } = await getCurrentLocation();
      setOneOffCoords({ latitude, longitude });
    } catch (err) {
      setLocateError(err.message);
    } finally {
      setLocating(false);
    }
  }

  function confirmOneOff() {
    if (oneOffText.trim().length < 3) return;
    onChange({
      addressLabel: oneOffText.trim(),
      latitude: oneOffCoords?.latitude ?? null,
      longitude: oneOffCoords?.longitude ?? null,
    });
    setSheetOpen(false);
  }

  return (
    <div>
      <span className="text-sm font-medium text-text-muted">Address</span>
      <button
        type="button"
        onClick={openSheet}
        className="mt-1.5 flex w-full items-start gap-3 rounded-md border border-border bg-surface px-4 py-3 text-left"
      >
        <PinIcon />
        <span className="min-w-0 flex-1 truncate text-text">
          {value?.addressLabel || 'Where should the worker come?'}
        </span>
        <span className="shrink-0 text-sm font-medium text-brand-solid">Change</span>
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-surface-raised p-5 shadow-raised sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Choose an address</h2>
              <button onClick={() => setSheetOpen(false)} className="text-text-muted" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {!oneOffMode ? (
              <div className="mt-4 flex flex-col gap-2">
                {addresses?.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => selectSaved(address)}
                    className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:bg-surface-alt"
                  >
                    <PinIcon />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && <Badge tone="success">Default</Badge>}
                      </span>
                      <span className="block truncate text-sm text-text-muted">{address.addressLabel}</span>
                    </span>
                  </button>
                ))}
                {addresses?.length === 0 && (
                  <p className="text-sm text-text-muted">No saved addresses yet.</p>
                )}
                <button
                  type="button"
                  onClick={() => setOneOffMode(true)}
                  className="mt-1 rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm font-medium text-brand-solid"
                >
                  + Enter a new address for this booking
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  label="Address"
                  placeholder="Where should the worker come?"
                  value={oneOffText}
                  onChange={(e) => setOneOffText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="self-start text-sm font-medium text-brand-solid disabled:opacity-50"
                >
                  {locating ? 'Locating...' : oneOffCoords ? 'Location captured' : 'Use my current location'}
                </button>
                {locateError && <p className="text-sm text-danger">{locateError}</p>}
                <div className="mt-2 flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setOneOffMode(false)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={oneOffText.trim().length < 3}
                    onClick={confirmOneOff}
                  >
                    Use this address
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
