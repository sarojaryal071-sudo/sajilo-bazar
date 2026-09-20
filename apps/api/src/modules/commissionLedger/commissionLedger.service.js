import * as commissionLedgerModel from './commissionLedger.model.js';

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

export async function getMyLedger(workerId) {
  const entries = await commissionLedgerModel.listForWorker(workerId);
  const balance = entries[0]?.creditBalanceAfter ?? 0;
  // No repayment flow exists yet (see COMMISSION_RATE comment), so a
  // negative balance is entirely unpaid commission - what's owed is just
  // its magnitude.
  const commissionOwed = round2(Math.max(0, -balance));
  return { balance, commissionOwed, entries };
}
