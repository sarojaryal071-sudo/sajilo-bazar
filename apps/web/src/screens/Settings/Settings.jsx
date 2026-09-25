import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NOTIFICATION_CATEGORIES } from '@sajilo-bazar/shared';
import { Screen } from '../../components/Screen.jsx';
import { Button } from '../../components/Button.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Input } from '../../components/Input.jsx';
import { GoogleSignInButton } from '../../components/GoogleSignInButton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import * as usersApi from '../../api/users.api.js';
import * as notificationsApi from '../../api/notifications.api.js';
import * as addressesApi from '../../api/addresses.api.js';
import { getCurrentLocation, getGeolocationPermissionState, getLocationBlockedMessage } from '../../lib/geolocation.js';

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const CATEGORY_LABELS = {
  bookings: 'Bookings & cancellations',
  chat: 'Chat messages',
  support: 'Disputes & support replies',
  reviews: 'Reviews & ratings',
  promos: 'Promos & announcements',
};

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Neumorphic-glass grouping used for every section on this screen - a
// frosted card (the existing glass-surface/glass-border/backdrop-blur
// tokens, same ones AuthScreen already uses) with a soft dual-shadow lift
// (shadow-neu-card), extending that look beyond the auth flow per this
// task's visual direction rather than inventing new tokens.
function SettingsSection({ title, children }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <div className="overflow-hidden rounded-3xl border border-glass-border bg-glass-surface shadow-neu-card backdrop-blur-xl">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ label, value, onClick, danger, disabled, last }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium transition-shadow active:shadow-neu-inset disabled:opacity-50 ${
        !last ? 'border-b border-glass-border' : ''
      } ${danger ? 'text-danger' : ''}`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        {value}
        {onClick && <ChevronIcon />}
      </span>
    </button>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  busy,
  confirmDisabled,
  error,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-t-3xl border border-glass-border bg-glass-surface p-6 shadow-neu-card backdrop-blur-xl sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-text-muted">{body}</p>
        {children}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function MiniToggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-brand-solid' : 'bg-surface-alt'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-resting transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// Settings -> Notifications: one row per category, four channel columns.
// Only In-app is real in this v1 (see notification_preferences migration) -
// SMS/Email/WhatsApp are visibly present but disabled, with a single
// "Coming soon" badge over the group rather than repeated per cell, same
// pattern as the eSewa payment placeholder on BookingDetail.
function NotificationMatrix({ preferences, onToggle, busyCategory }) {
  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_2.5rem] items-center gap-x-2 gap-y-4">
        <span />
        <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          In-app
        </span>
        <div className="col-span-3 flex justify-center">
          <Badge tone="neutral">Coming soon</Badge>
        </div>

        {NOTIFICATION_CATEGORIES.map((category) => (
          <Fragment key={category}>
            <span className="pr-2 text-sm font-medium">{CATEGORY_LABELS[category]}</span>
            <span className="flex justify-center">
              <MiniToggle
                checked={preferences?.[category] ?? true}
                disabled={busyCategory === category || !preferences}
                onChange={(next) => onToggle(category, next)}
              />
            </span>
            <span className="flex justify-center">
              <MiniToggle checked={false} disabled onChange={() => {}} />
            </span>
            <span className="flex justify-center">
              <MiniToggle checked={false} disabled onChange={() => {}} />
            </span>
            <span className="flex justify-center">
              <MiniToggle checked={false} disabled onChange={() => {}} />
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Add/edit a saved address - initial === null means "new", an address
// object means "edit" (and offers Delete). Shares the same "Use my current
// location" capture as AddressPicker's one-off entry.
function AddressFormDialog({ initial, onSave, onDelete, onCancel, busy, error }) {
  const [label, setLabel] = useState(initial?.label ?? 'Home');
  const [addressLabel, setAddressLabel] = useState(initial?.addressLabel ?? '');
  const [coords, setCoords] = useState(
    initial?.latitude != null ? { latitude: initial.latitude, longitude: initial.longitude } : null
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

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

  function handleSubmit(e) {
    e.preventDefault();
    if (addressLabel.trim().length < 3) return;
    onSave({
      label: label.trim() || 'Home',
      addressLabel: addressLabel.trim(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-t-3xl border border-glass-border bg-glass-surface p-6 shadow-neu-card backdrop-blur-xl sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">{initial ? 'Edit address' : 'Add address'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Input label="Label" placeholder="Home, Office..." value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input
            label="Address"
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
          <div className="mt-2 flex items-center gap-3">
            {initial && (
              <button type="button" onClick={onDelete} disabled={busy} className="text-sm font-medium text-danger">
                Delete
              </button>
            )}
            <div className="ml-auto flex gap-3">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || addressLabel.trim().length < 3}>
                {busy ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Settings -> Locations (customer only - see docs/SCREENS.md). The Home
// Location set at signup shows up here as the default address; a customer
// can add more, edit, delete, or change which one is default.
function LocationsSection({ addresses, onAdd, onEdit, onSetDefault }) {
  return (
    <>
      {addresses === null ? (
        <p className="px-4 py-3.5 text-sm text-text-muted">Loading...</p>
      ) : addresses.length === 0 ? (
        <p className="px-4 py-3.5 text-sm text-text-muted">No saved addresses yet.</p>
      ) : (
        addresses.map((address) => (
          <div key={address.id} className="flex items-center gap-3 border-b border-glass-border px-4 py-3.5">
            <button type="button" onClick={() => onEdit(address)} className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{address.label}</span>
                {address.isDefault && <Badge tone="success">Default</Badge>}
              </span>
              <span className="block truncate text-xs text-text-muted">{address.addressLabel}</span>
            </button>
            {!address.isDefault && (
              <button
                type="button"
                onClick={() => onSetDefault(address)}
                className="shrink-0 text-xs font-medium text-brand-solid"
              >
                Set default
              </button>
            )}
          </div>
        ))
      )}
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center px-4 py-3.5 text-left text-sm font-medium text-brand-solid"
      >
        + Add address
      </button>
    </>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [dialog, setDialog] = useState(null); // 'deactivate' | 'delete' | 'unlink-google' | null
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [preferences, setPreferences] = useState(null);
  const [busyCategory, setBusyCategory] = useState(null);
  const [addresses, setAddresses] = useState(null);
  const [addressDialog, setAddressDialog] = useState(null); // null | 'new' | an address object
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    notificationsApi
      .getPreferences()
      .then(({ preferences }) => setPreferences(preferences))
      .catch(() => {});
    if (user.role === 'customer') loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadAddresses() {
    addressesApi
      .list()
      .then(({ addresses }) => setAddresses(addresses))
      .catch(() => setAddresses([]));
  }

  async function handleSaveAddress(input) {
    setAddressBusy(true);
    setAddressError('');
    try {
      if (addressDialog === 'new') {
        await addressesApi.create(input);
      } else {
        await addressesApi.update(addressDialog.id, input);
      }
      loadAddresses();
      setAddressDialog(null);
    } catch (err) {
      setAddressError(err.message);
    } finally {
      setAddressBusy(false);
    }
  }

  async function handleDeleteAddress() {
    setAddressBusy(true);
    setAddressError('');
    try {
      await addressesApi.remove(addressDialog.id);
      loadAddresses();
      setAddressDialog(null);
    } catch (err) {
      setAddressError(err.message);
    } finally {
      setAddressBusy(false);
    }
  }

  async function handleSetDefaultAddress(address) {
    try {
      await addressesApi.setDefault(address.id);
      loadAddresses();
    } catch {
      // Non-critical - the list just doesn't reflect the change; the user
      // can retry the same tap.
    }
  }

  async function handleTogglePreference(category, next) {
    setBusyCategory(category);
    setPreferences((prev) => ({ ...prev, [category]: next })); // optimistic
    try {
      const { preferences } = await notificationsApi.updatePreference({ category, inApp: next });
      setPreferences(preferences);
    } catch {
      setPreferences((prev) => ({ ...prev, [category]: !next })); // roll back
    } finally {
      setBusyCategory(null);
    }
  }

  function closeDialog() {
    setDialog(null);
    setDialogError('');
    setDialogBusy(false);
    setDeleteConfirmText('');
  }

  async function handleConnectGoogle(idToken) {
    setGoogleError('');
    setGoogleBusy(true);
    try {
      await usersApi.linkGoogleAccount(idToken);
      await refreshUser();
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleUnlinkGoogle() {
    setDialogBusy(true);
    setDialogError('');
    try {
      await usersApi.unlinkGoogleAccount();
      await refreshUser();
      closeDialog();
    } catch (err) {
      setDialogError(err.message);
      setDialogBusy(false);
    }
  }

  async function handleDeactivate() {
    setDialogBusy(true);
    setDialogError('');
    try {
      await usersApi.deactivateAccount();
      logout();
    } catch (err) {
      setDialogError(err.message);
      setDialogBusy(false);
    }
  }

  async function handleDelete() {
    setDialogBusy(true);
    setDialogError('');
    try {
      await usersApi.deleteAccount();
      logout();
    } catch (err) {
      setDialogError(err.message);
      setDialogBusy(false);
    }
  }

  return (
    <Screen fillHeight={false}>
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-text-muted">
          &larr; Back
        </button>
      </div>
      <h1 className="mt-4 text-2xl font-bold">Settings</h1>

      <SettingsSection title="Account">
        <SettingsRow label="Change password" onClick={() => navigate('/forgot-password')} />
        {GOOGLE_CONFIGURED && (
          <div className={`px-4 py-3.5 ${'border-b border-glass-border'}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Connected Google account</span>
              {user.googleId ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <span className="text-xs text-text-muted">Not connected</span>
              )}
            </div>
            {googleError && <p className="mt-2 text-xs text-danger">{googleError}</p>}
            <div className="mt-3">
              {user.googleId ? (
                <button
                  type="button"
                  onClick={() => setDialog('unlink-google')}
                  className="text-xs font-medium text-danger"
                >
                  Disconnect
                </button>
              ) : googleBusy ? (
                <p className="text-xs text-text-muted">Connecting...</p>
              ) : (
                <GoogleSignInButton onCredential={handleConnectGoogle} text="continue_with" />
              )}
            </div>
          </div>
        )}
        <SettingsRow
          label="Deactivate account"
          value="Reversible"
          onClick={() => setDialog('deactivate')}
          last={false}
        />
        <SettingsRow label="Delete account" danger onClick={() => setDialog('delete')} last />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          label={t('menu.language')}
          value={language === 'en' ? t('menu.english') : t('menu.nepali')}
          onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
        />
        <SettingsRow
          label={t('menu.theme')}
          value={theme === 'dark' ? t('menu.dark') : t('menu.light')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          last
        />
      </SettingsSection>

      {user.role === 'customer' && (
        <SettingsSection title="Locations">
          <LocationsSection
            addresses={addresses}
            onAdd={() => setAddressDialog('new')}
            onEdit={(address) => setAddressDialog(address)}
            onSetDefault={handleSetDefaultAddress}
          />
        </SettingsSection>
      )}

      <SettingsSection title="Notifications">
        <NotificationMatrix
          preferences={preferences}
          busyCategory={busyCategory}
          onToggle={handleTogglePreference}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow label="Contact support" onClick={() => navigate('/help')} />
        <SettingsRow label="Terms & Conditions" onClick={() => navigate('/terms')} />
        <SettingsRow label="Privacy Policy" onClick={() => navigate('/privacy')} last />
      </SettingsSection>

      {dialog === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate account?"
          body="You'll stop appearing in search and won't be able to book or be booked while deactivated. All your data is kept - logging back in reactivates your account automatically."
          confirmLabel="Deactivate"
          busy={dialogBusy}
          error={dialogError}
          onConfirm={handleDeactivate}
          onCancel={closeDialog}
        />
      )}

      {dialog === 'unlink-google' && (
        <ConfirmDialog
          title="Disconnect Google account?"
          body="You'll only be able to log in with your phone number and password from now on."
          confirmLabel="Disconnect"
          danger
          busy={dialogBusy}
          error={dialogError}
          onConfirm={handleUnlinkGoogle}
          onCancel={closeDialog}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete account?"
          body="This can't be undone. Your name, phone, email and photo will be permanently removed. Booking and dispute history is kept in anonymized form, as described in our Privacy Policy."
          confirmLabel="Delete forever"
          danger
          busy={dialogBusy}
          confirmDisabled={deleteConfirmText !== 'DELETE'}
          error={dialogError}
          onConfirm={handleDelete}
          onCancel={closeDialog}
        >
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              Type <span className="font-bold text-text">DELETE</span> to confirm
            </span>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-danger"
              autoComplete="off"
            />
          </label>
        </ConfirmDialog>
      )}

      {addressDialog && (
        <AddressFormDialog
          initial={addressDialog === 'new' ? null : addressDialog}
          busy={addressBusy}
          error={addressError}
          onSave={handleSaveAddress}
          onDelete={handleDeleteAddress}
          onCancel={() => {
            setAddressDialog(null);
            setAddressError('');
          }}
        />
      )}
    </Screen>
  );
}
