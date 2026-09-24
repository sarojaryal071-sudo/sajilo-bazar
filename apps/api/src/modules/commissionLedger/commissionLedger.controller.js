import * as commissionLedgerService from './commissionLedger.service.js';

export async function getMySummary(req, res, next) {
  try {
    const summary = await commissionLedgerService.getSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getMySparkline(req, res, next) {
  try {
    const sparkline = await commissionLedgerService.getSparkline(req.user.id);
    res.json({ sparkline });
  } catch (err) {
    next(err);
  }
}

export async function getMySeries(req, res, next) {
  try {
    const range = req.query.range ?? '30';
    const series = await commissionLedgerService.getSeries(req.user.id, range);
    res.json({ range, series });
  } catch (err) {
    next(err);
  }
}

export async function getMyHistory(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const result = await commissionLedgerService.getHistory(req.user.id, { page });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
