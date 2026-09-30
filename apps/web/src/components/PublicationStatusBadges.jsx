import { Badge } from './Badge.jsx';

// Content merge (target-spec Phase 5) - AdminPublications.jsx and
// AdminPolicies.jsx each had their own identical STATUS_TONE map and the
// exact same "status badge + isLive badge" pair rendered next to it.
// Extracted once both landed in the same file, same spirit as Phase 4's
// SettingEditor extraction - a clean, obvious duplication, not a forced one.
const STATUS_TONE = { draft: 'neutral', published: 'success', unpublished: 'neutral' };

export function PublicationStatusBadges({ status, isLive }) {
  return (
    <div className="flex items-center gap-2">
      <Badge tone={STATUS_TONE[status]}>{status}</Badge>
      {isLive && <Badge tone="success">Live now</Badge>}
    </div>
  );
}
