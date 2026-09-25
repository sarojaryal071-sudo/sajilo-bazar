import { useState } from 'react';
import { Input } from './Input.jsx';
import { Button } from './Button.jsx';
import * as addressesApi from '../api/addresses.api.js';
import { getCurrentLocation, getGeolocationPermissionState, getLocationBlockedMessage } from '../lib/geolocation.js';

// Signup's final step for a new customer only (workers have no addresses -
// see docs/SCREENS.md) - Uber-style: type an address, optionally attach the
// browser's current position, and it's saved as the default Home Location
// (addressesService.createAddress makes the first address a customer ever
// saves the default automatically). Skippable - this is new signup
// friction, and a customer can always add one later from Settings.
export function HomeLocationStep({ onDone }) {
  const [addressLabel, setAddressLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      setCoords({ latitude, longitude });
    } catch (err) {
      setLocateError(err.message);
    } finally {
      setLocating(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (addressLabel.trim().length < 3) {
      setError('Enter your address, or skip for now.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addressesApi.create({
        label: 'Home',
        addressLabel: addressLabel.trim(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        isDefault: true,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-center text-2xl font-bold">Set your home location</h1>
      <p className="mt-1 text-center text-text-muted">
        This becomes your default address when booking a service - you can change it anytime later in Settings.
      </p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <Input
          label="Home address"
          placeholder="Street, area, city"
          value={addressLabel}
          onChange={(e) => setAddressLabel(e.target.value)}
        />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="self-start text-sm font-medium text-brand-solid disabled:opacity-50"
        >
          {locating ? 'Locating...' : coords ? 'Location captured' : 'Use my current location'}
        </button>
        {locateError && <p className="text-sm text-danger">{locateError}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving} className="auth-btn mt-2 w-full">
          {saving ? 'Saving...' : 'Save & continue'}
        </Button>
      </form>

      <button type="button" onClick={onDone} className="mt-4 w-full text-center text-sm text-text-muted">
        Skip for now
      </button>
    </div>
  );
}
