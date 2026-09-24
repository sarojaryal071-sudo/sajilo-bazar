// Pure computation for "is this worker effectively online right now", given
// their weekly availability blocks and their last manual override. No cron/
// scheduler exists in this codebase (a plain request-driven Express app) -
// rather than build one, effective online status is computed on demand
// here and synced to worker_profiles.is_online at the touchpoints that
// actually need it to be fresh: the worker's own dashboard load, and a
// full pass over every worker with a schedule right before instant-request
// matching runs (see workers.service.js syncEffectiveOnline/
// syncAllWorkersWithAvailability, called from bookings.service.js). A block
// is { dayOfWeek: 0-6 (JS Date#getDay()), startTime: 'HH:MM', endTime: 'HH:MM' }.

const DAY_MS = 24 * 60 * 60 * 1000;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isWithinBlock(blocks, now) {
  const dayOfWeek = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return blocks.some(
    (b) => b.dayOfWeek === dayOfWeek && minutes >= toMinutes(b.startTime) && minutes < toMinutes(b.endTime)
  );
}

// The earliest block start/end instant strictly after `after` - a manual
// override stays in effect until this point. Scans an 8-day window, which
// is always enough to find the next occurrence of any weekly-recurring
// block regardless of which day `after` falls on.
export function nextBoundaryAfter(blocks, after) {
  if (blocks.length === 0) return null;
  const rangeEnd = new Date(after.getTime() + 8 * DAY_MS);
  let earliest = null;
  const cursor = new Date(after);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < rangeEnd) {
    for (const b of blocks) {
      if (b.dayOfWeek !== cursor.getDay()) continue;
      for (const time of [b.startTime, b.endTime]) {
        const [h, m] = time.split(':').map(Number);
        const instant = new Date(cursor);
        instant.setHours(h, m, 0, 0);
        if (instant > after && (!earliest || instant < earliest)) earliest = instant;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return earliest;
}

// manualIsOnline/overriddenAt are worker_profiles.is_online/
// online_overridden_at - the worker's last explicit toggle. With no
// availability blocks set at all, a worker is in pure-manual mode (today's
// behavior, unchanged). With blocks set, the manual override wins until the
// next block boundary after it was set, then the schedule takes over.
export function computeEffectiveOnline({ blocks, manualIsOnline, overriddenAt, now = new Date() }) {
  if (!blocks || blocks.length === 0) return manualIsOnline;

  if (overriddenAt) {
    const boundary = nextBoundaryAfter(blocks, new Date(overriddenAt));
    if (!boundary || now < boundary) return manualIsOnline;
  }

  return isWithinBlock(blocks, now);
}
