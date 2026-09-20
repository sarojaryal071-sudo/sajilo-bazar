import * as commissionLedgerService from './commissionLedger.service.js';

export async function getMyLedger(req, res, next) {
  try {
    const ledger = await commissionLedgerService.getMyLedger(req.user.id);
    res.json(ledger);
  } catch (err) {
    next(err);
  }
}
