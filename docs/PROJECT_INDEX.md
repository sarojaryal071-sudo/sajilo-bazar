# Project Index

Maintained file-by-file map of the repo. Updated as the last step of every task
(see `docs/WORKING_AGREEMENT.md` §5). A session should be able to orient from this
file alone, without re-reading the whole codebase.

This index is filled in incrementally - only files touched by a task get an entry
here as part of that task. A file with no entry yet doesn't mean it's undocumented
forever, just that no session has touched it since this index was introduced.

_Last updated: 2026-09-24 — Backfill script for commission_ledger entries missing from bookings completed before the ledger's insert call existed_

## apps/api
| File | Purpose |
|---|---|
| `src/db/backfillCommissionLedger.js` | One-time (idempotent, safe to re-run) script: finds completed bookings with no `commission_ledger` row and inserts them, recomputing each affected worker's running balance chain in chronological order. Run via `npm run backfill:ledger --workspace apps/api` |
| `src/modules/commissionLedger/commissionLedger.model.js` | SQL for the commission ledger: create on booking completion, latest balance, lifetime/month/week totals (`findTotals`), zero-filled daily/monthly series for charts, paginated transaction history with customer name |
| `src/modules/commissionLedger/commissionLedger.service.js` | Business logic: 15% `COMMISSION_RATE`, `recordCompletion` (called from bookings.service.js), `getSummary`/`getSparkline`/`getSeries`/`getHistory` for the Earnings screen and Dashboard card |
| `src/modules/commissionLedger/commissionLedger.controller.js` | Route handlers for `GET /commission-ledger/me/{summary,sparkline,series,history}` |
| `src/modules/commissionLedger/commissionLedger.routes.js` | Mounts the above under `requireAuth, requireRole('worker')` |

## apps/web
| File | Purpose |
|---|---|
| `src/api/commissionLedger.api.js` | Client for the four `/commission-ledger/me/*` endpoints |
| `src/components/EarningsChart.jsx` | Zero-dependency inline-SVG bar chart, shared by the Dashboard sparkline (`compact`) and the full Earnings range chart |
| `src/screens/WorkerDashboard/WorkerDashboard.jsx` | Worker home screen; includes the compact `EarningsCard` (7-day sparkline, this week's total + jobs count) that links to `/worker/earnings` |
| `src/screens/Earnings/Earnings.jsx` | Full Earnings screen: summary stat row, 7D/30D/All range chart, paginated ("Load more") transaction history with customer/amount/commission/running balance, empty state |

## packages/shared
| File | Purpose |
|---|---|
| `schemas/commissionLedger.schema.js` | `CommissionLedgerEntrySchema` - one row of a worker's commission ledger, incl. `customerName` |

## docs
| File | Purpose |
|---|---|
| `WORKING_AGREEMENT.md` | Session ground rules: orient from this index, lightweight-only testing, scope discipline, git workflow, end-of-task checklist |
| `PROJECT_INDEX.md` | This file |
| `SCREENS.md` | Screen inventory by build phase |
| `DATA_MODEL.md` | Full DB schema reference, incl. `commission_ledger` (§11) |
| `DESIGN_SYSTEM.md` | Visual design tokens/patterns for the customer/worker-facing app |
