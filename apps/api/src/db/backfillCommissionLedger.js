// One-time (but safe to re-run) backfill for commission_ledger.
//
// recordCompletion() only fires at the moment a booking transitions to
// 'completed' (see bookings.service.js completeBooking) - it was added to
// the codebase after the app had already been live for a while, so any
// booking that reached 'completed' status before that code existed has no
// matching commission_ledger row and will never get one on its own. This
// script finds those gaps and fills them in, so past jobs count toward a
// worker's Earnings screen and Dashboard card exactly like new ones do.
//
// Per worker, it doesn't just insert the missing rows - it walks *all* of
// that worker's completed bookings in chronological order and recomputes
// credit_balance_after for each one. That's necessary because
// credit_balance_after is a running total (see DATA_MODEL.md #11): if a
// worker already has ledger entries for jobs completed after some
// backfilled (older) job, those later entries' stored balance was computed
// without knowing about the older job, so it has to be corrected too, or
// the worker's current balance would be quietly wrong.
//
// Usage:
//   npm run backfill:ledger --workspace apps/api
//   DATABASE_URL="<neon connection string>" npm run backfill:ledger --workspace apps/api

import 'dotenv/config';
import { pool } from './pool.js';
import { COMMISSION_RATE } from '../modules/commissionLedger/commissionLedger.service.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function main() {
  console.log('Backfilling commission_ledger for completed bookings missing an entry...');

  const { rows: affectedWorkers } = await pool.query(
    `SELECT DISTINCT b.worker_id
     FROM bookings b
     LEFT JOIN commission_ledger cl ON cl.booking_id = b.id
     WHERE b.status = 'completed' AND cl.id IS NULL`
  );

  if (affectedWorkers.length === 0) {
    console.log('Nothing to backfill - every completed booking already has a ledger entry.');
    await pool.end();
    return;
  }

  let totalInserted = 0;
  let totalCorrected = 0;

  for (const { worker_id: workerId } of affectedWorkers) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock this worker's bookings/ledger rows for the duration so a job
      // completing concurrently can't race the recomputation below.
      const { rows: bookings } = await client.query(
        `SELECT b.id AS booking_id, b.price, COALESCE(b.completed_at, b.created_at) AS occurred_at,
                cl.id AS ledger_id, cl.commission_amount, cl.credit_balance_after
         FROM bookings b
         LEFT JOIN commission_ledger cl ON cl.booking_id = b.id
         WHERE b.worker_id = $1 AND b.status = 'completed'
         ORDER BY COALESCE(b.completed_at, b.created_at) ASC
         FOR UPDATE OF b`,
        [workerId]
      );

      let balance = 0;
      let inserted = 0;
      let corrected = 0;

      for (const b of bookings) {
        const price = Number(b.price);
        const commission = b.ledger_id ? Number(b.commission_amount) : round2(price * COMMISSION_RATE);
        balance = round2(balance - commission);

        if (!b.ledger_id) {
          await client.query(
            `INSERT INTO commission_ledger (worker_id, booking_id, job_price, commission_amount, credit_balance_after, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [workerId, b.booking_id, price, commission, balance, b.occurred_at]
          );
          inserted++;
        } else if (Number(b.credit_balance_after) !== balance) {
          await client.query('UPDATE commission_ledger SET credit_balance_after = $1 WHERE id = $2', [
            balance,
            b.ledger_id,
          ]);
          corrected++;
        }
      }

      await client.query('COMMIT');
      totalInserted += inserted;
      totalCorrected += corrected;
      console.log(
        `Worker #${workerId}: inserted ${inserted} missing entr${inserted === 1 ? 'y' : 'ies'}, ` +
          `corrected ${corrected} running balance${corrected === 1 ? '' : 's'}, final balance Rs. ${balance}`
      );
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Worker #${workerId}: backfill failed, rolled back.`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`Done. ${totalInserted} entries inserted, ${totalCorrected} balances corrected across ${affectedWorkers.length} worker(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
