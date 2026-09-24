import * as commissionLedgerModel from './commissionLedger.model.js';
import { ApiError } from '../../middleware/error.middleware.js';

// Judgment call: no commission rate is specified anywhere in the docs, so
// this picks a flat 15% platform cut - a common rate for local-services
// marketplaces. Revisit once the business has an actual number.
export const COMMISSION_RATE = 0.15;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Called when a booking transitions to completed. The worker collects the
// full job price directly from the customer (no in-app payment until Phase
// 8), so each completed job books a commission debt against the worker's
// running balance rather than deducting from a prepaid credit.
export async function recordCompletion(booking) {
  const jobPrice = booking.price;
  const commissionAmount = round2(jobPrice * COMMISSION_RATE);
  const previousBalance = await commissionLedgerModel.findLatestBalance(booking.workerId);
  const creditBalanceAfter = round2(previousBalance - commissionAmount);

  return commissionLedgerModel.create({
    workerId: booking.workerId,
    bookingId: booking.id,
    jobPrice,
    commissionAmount,
    creditBalanceAfter,
  });
}

const HISTORY_PAGE_SIZE = 20;
const SERIES_RANGES = new Set(['7', '30', 'all']);

// Summary stat row for the Earnings screen, and the compact card on the
// worker Dashboard (which only needs thisWeekEarned/thisWeekJobsCompleted
// plus a short sparkline - see getSparkline below).
export async function getSummary(workerId) {
  const [totals, balance] = await Promise.all([
    commissionLedgerModel.findTotals(workerId),
    commissionLedgerModel.findLatestBalance(workerId),
  ]);
  // No repayment flow exists yet (see COMMISSION_RATE comment), so a
  // negative balance is entirely unpaid commission - what's owed is just
  // its magnitude, and whatever commission isn't currently owed must have
  // been paid (always 0 today, but this stays correct once repayments
  // exist and start moving the balance back toward zero).
  const commissionOwed = round2(Math.max(0, -balance));
  return {
    totalEarned: round2(totals.totalEarned),
    thisMonthEarned: round2(totals.thisMonthEarned),
    thisWeekEarned: round2(totals.thisWeekEarned),
    thisWeekJobsCompleted: totals.thisWeekJobsCompleted,
    commissionOwed,
    creditBalance: round2(balance),
  };
}

// 7-day sparkline for the Dashboard card - a smaller slice of the same
// daily series the full Earnings chart uses for its 7-day range.
export function getSparkline(workerId) {
  return commissionLedgerModel.findDailySeries(workerId, 7);
}

export function getSeries(workerId, range) {
  if (!SERIES_RANGES.has(range)) {
    throw new ApiError(400, "range must be '7', '30', or 'all'");
  }
  if (range === 'all') return commissionLedgerModel.findMonthlySeries(workerId);
  return commissionLedgerModel.findDailySeries(workerId, Number(range));
}

export async function getHistory(workerId, { page = 1 } = {}) {
  const offset = (Math.max(1, page) - 1) * HISTORY_PAGE_SIZE;
  const { entries, total } = await commissionLedgerModel.listForWorkerPage(workerId, {
    limit: HISTORY_PAGE_SIZE,
    offset,
  });
  return { entries, hasMore: offset + entries.length < total };
}
