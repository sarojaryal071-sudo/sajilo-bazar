// Shared by the instant-request flow (customer) and the online toggle
// (worker) - both need the browser's current position. The permission-
// denied message only makes sense while the browser might still show its
// native prompt (state 'prompt') - once it's actually 'denied', the caller
// should short-circuit before ever calling this (see
// getGeolocationPermissionState) and show getLocationBlockedMessage instead,
// since the browser won't prompt again on its own.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Your browser does not support location access.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          return reject(new Error('Location access is required. Please allow it and try again.'));
        }
        reject(new Error('Could not determine your location. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Ahead-of-time permission check, so a caller can tell 'the browser hasn't
// asked yet' (native prompt will still appear) apart from 'the user already
// blocked this' (it won't - see getLocationBlockedMessage). Safari doesn't
// implement the 'geolocation' Permissions API entry as of this writing, and
// any browser without navigator.permissions falls back the same way -
// 'unknown' just means the caller should try requesting the position
// directly, same as it always has.
export async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown';
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Once a browser has denied a site's location permission, it won't show its
// own prompt again - the only way back in is the browser's site-settings
// UI, which lives in a different place on iOS than everywhere else.
export function getLocationBlockedMessage() {
  if (isIOS()) {
    return 'Location is blocked for this site. Enable it in Settings > Privacy & Security > Location Services, then reload this page.';
  }
  return "Location is blocked for this site. Enable it in your browser's site settings, then reload this page.";
}
