const EARTH_RADIUS_KM = 6371;

// Pure-JS Haversine, factored out for reuse (Piece D, 2026-09-27). The
// nearby-worker matching query (bookings.model.js findNearbyOnlineWorkers)
// computes the same formula inline in raw SQL, since it has to run
// per-row across every online worker in one query - not something this
// plain JS function can help with. This is for the one-pair-of-coordinates
// case instead: given exactly two points (e.g. a worker's saved location
// and a booking's address), return the distance between them in km.
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
