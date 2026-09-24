import * as trustScoreModel from './trustScore.model.js';
import * as adminModel from '../admin/admin.model.js';

// ---- Business-plan-locked numbers (Part 1) - do not reinterpret. ----
const WEIGHT_RATING = 0.4;
const WEIGHT_RELIABILITY = 0.3;
const WEIGHT_TENURE = 0.15;
const WEIGHT_DISPUTES = 0.15;

// No "Newly Joined" grace period mechanism existed anywhere in the
// codebase before this task (searched thoroughly - nothing governs
// "featured placement" today). 30 days is a judgment call that keeps this
// consistent with the other rolling-30 windows the same spec already uses
// elsewhere (cancellation rate, dispute count) - see docs/DATA_MODEL.md
// §2 for the full note.
const GRACE_PERIOD_DAYS = 30;

// Judgment calls, not locked by the business plan (only the four weights
// above are) - see the completion report for the reasoning:
const RELIABILITY_WINDOW = 30;
const RELIABILITY_MIN_JOBS = 10;
const CANCELLATION_ESCALATION_THRESHOLD = 0.15;
const DISPUTE_ESCALATION_THRESHOLD = 3;
const TENURE_CAP_MONTHS = 12;
const DISPUTE_DEDUCTION_PER_INCIDENT = 20;

function isInGracePeriod(approvedAt) {
  if (!approvedAt) return true;
  const days = (Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days < GRACE_PERIOD_DAYS;
}

// Rolling window of the worker's own reliability - see
// trustScoreModel.findRecentReliabilityJobs for why customer-initiated
// cancellations are excluded entirely rather than just left out of the
// numerator.
async function computeReliability(workerId) {
  const jobs = await trustScoreModel.findRecentReliabilityJobs(workerId, RELIABILITY_WINDOW + 1);
  const currentWindow = jobs.slice(0, RELIABILITY_WINDOW);
  const previousWindow = jobs.slice(1, RELIABILITY_WINDOW + 1);

  function rateOf(window) {
    if (window.length < RELIABILITY_MIN_JOBS) return null;
    const cancelledCount = window.filter((j) => j.status === 'cancelled').length;
    return cancelledCount / window.length;
  }

  return {
    count: currentWindow.length,
    cancelledCount: currentWindow.filter((j) => j.status === 'cancelled').length,
    rate: rateOf(currentWindow),
    previousRate: rateOf(previousWindow),
  };
}

// Reliability component for the trust score itself doesn't gate on the
// 10-job minimum the escalation trigger uses - a worker with too little
// history yet just scores on whatever they have (treated as perfectly
// reliable, i.e. no penalty, until there's enough signal to say otherwise).
function reliabilityScoreFrom(reliability) {
  if (reliability.rate === null) return 100;
  return Math.max(0, (1 - reliability.rate) * 100);
}

function tenureScoreFrom(approvedAt) {
  if (!approvedAt) return 0;
  const months = (Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, Math.min(1, months / TENURE_CAP_MONTHS)) * 100;
}

function disputeScoreFrom(atFaultCount) {
  return Math.max(0, 100 - atFaultCount * DISPUTE_DEDUCTION_PER_INCIDENT);
}

function tierFor(score) {
  if (score === null) return 'building_trust';
  if (score >= 80) return 'highly_trusted';
  if (score >= 50) return 'trusted';
  return 'building_trust';
}

function actionableTips({ ratingScore, reliability, atFaultCount }) {
  const tips = [];
  if (reliability.rate !== null && reliability.rate > CANCELLATION_ESCALATION_THRESHOLD) {
    tips.push('Your cancellation rate is above target - reduce it to improve your score.');
  }
  if (ratingScore < 70) {
    tips.push('Your average rating is below target - quality of service is the biggest factor in your score.');
  }
  if (atFaultCount > 0) {
    tips.push(
      `You have ${atFaultCount} at-fault dispute${atFaultCount === 1 ? '' : 's'} on record - avoiding disputes protects your score.`
    );
  }
  if (tips.length === 0) {
    tips.push("You're doing great - keep completing jobs reliably to keep building your score.");
  }
  return tips;
}

// The full computation - always runs, even during the grace period, so
// recomputeAndStore always has a number ready the moment grace ends. Only
// the caller decides whether the raw score is actually exposed/stored
// (see recomputeAndStore/getMyTrustScore).
async function compute(workerId) {
  const profile = await trustScoreModel.findScoringProfile(workerId);
  if (!profile) return null;

  const [reliability, atFaultCount] = await Promise.all([
    computeReliability(workerId),
    adminModel.countAtFaultDisputesForWorker(workerId),
  ]);

  const ratingScore = (profile.ratingAvg / 5) * 100;
  const reliabilityScore = reliabilityScoreFrom(reliability);
  const tenureScore = tenureScoreFrom(profile.approvedAt);
  const disputeScore = disputeScoreFrom(atFaultCount);

  const score = Math.round(
    ratingScore * WEIGHT_RATING +
      reliabilityScore * WEIGHT_RELIABILITY +
      tenureScore * WEIGHT_TENURE +
      disputeScore * WEIGHT_DISPUTES
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: {
      rating: Math.round(ratingScore),
      reliability: Math.round(reliabilityScore),
      tenure: Math.round(tenureScore),
      disputes: Math.round(disputeScore),
    },
    atFaultDisputeCount: atFaultCount,
    cancellationRate: reliability.rate,
    tips: actionableTips({ ratingScore, reliability, atFaultCount }),
    inGracePeriod: isInGracePeriod(profile.approvedAt),
  };
}

// Recomputes and persists the raw score - called at the mutation points
// that can actually move it (job completion, worker-initiated cancellation,
// an at-fault-worker dispute resolution). Stores null during the grace
// period rather than a real number, so a later ranking task can trust
// "trust_score IS NOT NULL" as "eligible to be ranked on this".
export async function recomputeAndStore(workerId) {
  const result = await compute(workerId);
  if (!result) return null;
  const stored = result.inGracePeriod ? null : result.score;
  await trustScoreModel.updateTrustScore(workerId, stored);
  return result;
}

// Worker's own panel - full breakdown, always freshly recomputed (and
// re-persisted) rather than trusting whatever was last stored, so the
// worker never sees a stale number just because some earlier event path
// didn't happen to trigger a recompute.
export async function getMyTrustScore(workerId) {
  const result = await recomputeAndStore(workerId);
  if (!result) return null;
  return {
    score: result.inGracePeriod ? null : result.score,
    tier: tierFor(result.inGracePeriod ? null : result.score),
    inGracePeriod: result.inGracePeriod,
    breakdown: result.breakdown,
    tips: result.tips,
  };
}

// Customer-facing tier only - reads whatever is currently stored (kept
// fresh by the mutation-point recomputes above) rather than recomputing on
// every search/detail read. Never exposes the raw number, the breakdown,
// or the dispute count - just the tier, per the spec's "no raw number, no
// breakdown, no dispute count anywhere" on customer-facing surfaces.
export function tierForStoredScore(trustScore) {
  return tierFor(trustScore);
}

// ---- Cancellation escalation (Part 2) ----

// Fires the 3-strikes-style admin-review ticket exactly once per crossing
// into the threshold, not on every cancellation while the rate stays above
// it - mirrors admin.service.js decideDocument's exact-count-match firing,
// adapted for a rate metric by comparing the window's rate just before vs.
// just after this cancellation. Reconstructs "just before" from the
// currently persisted window (dropping the newest row), which only reflects
// a real crossing when called exactly once per newly-persisted worker
// cancellation - which is how bookings.service.js's cancelBooking calls it
// (synchronously, once, right after the row is written). Calling it again
// against the same unchanged window would fire again, since nothing here
// tracks "already escalated" state - not a concern at the one real call
// site, but worth knowing if this is ever reused elsewhere.
export async function checkCancellationEscalation(workerId) {
  const reliability = await computeReliability(workerId);
  if (reliability.rate === null) return;
  const wasBelow = reliability.previousRate === null || reliability.previousRate < CANCELLATION_ESCALATION_THRESHOLD;
  const nowAtOrAbove = reliability.rate >= CANCELLATION_ESCALATION_THRESHOLD;
  if (!wasBelow || !nowAtOrAbove) return;

  await adminModel.createSupportTicket({
    userId: workerId,
    bookingId: null,
    subject: 'Worker cancellation rate above target',
    priority: 'high',
    message:
      `This worker's rolling ${RELIABILITY_WINDOW}-job cancellation rate has crossed ` +
      `${Math.round(CANCELLATION_ESCALATION_THRESHOLD * 100)}% (currently ` +
      `${reliability.cancelledCount}/${reliability.count}). Auto-opened for review - not an automatic suspension.`,
  });
}

// ---- Dispute escalation (Part 3) ----

// Exact-count-match firing, same as the existing 3-strikes document
// rejection pattern this directly reuses the shape of.
export async function checkDisputeEscalation(workerId) {
  const count = await adminModel.countAtFaultDisputesForWorkerRolling30(workerId);
  if (count !== DISPUTE_ESCALATION_THRESHOLD) return;

  await adminModel.createSupportTicket({
    userId: workerId,
    bookingId: null,
    subject: 'Worker has repeated at-fault disputes',
    priority: 'high',
    message:
      `This worker has been found at-fault in ${DISPUTE_ESCALATION_THRESHOLD} disputes within the last 30 days. ` +
      'Auto-opened for a human to review - not an automatic suspension.',
  });
}
