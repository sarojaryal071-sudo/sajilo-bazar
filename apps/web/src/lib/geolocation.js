// Shared by the instant-request flow (customer) and the online toggle
// (worker) - both need the browser's current position and the same
// fallback error message when it's unavailable/denied.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Your browser does not support location access.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error('Location access is required. Please allow it and try again.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
