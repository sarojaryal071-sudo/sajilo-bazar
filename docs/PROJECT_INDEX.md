# Project Index

Maintained file-by-file map of the repo. Updated as the last step of every task
(see `docs/WORKING_AGREEMENT.md` §5). A session should be able to orient from this
file alone, without re-reading the whole codebase.

This index is filled in incrementally - only files touched by a task get an entry
here as part of that task. A file with no entry yet doesn't mean it's undocumented
forever, just that no session has touched it since this index was introduced.

_Last updated: 2026-09-24 — Category-grouped/scoped service picker + hybrid cross-category review (high_risk data, document-gated approval)_

## apps/api
| File | Purpose |
|---|---|
| `src/db/migrations/024_service_category_review_hardening.sql` | Adds `services.high_risk` (seeded true for `electrical` only), `worker_services.review_comment`, and `verification_documents.worker_service_id` (links a supporting document to the specific cross-category service request it was submitted for) |
| `src/modules/workers/workers.model.js` | `addWorkerService` now upserts approval_status/reviewer fields on retry and accepts an optional transaction client; `insertDocument` accepts `workerServiceId`; `toService`/`toWorkerService` carry `highRisk`/`reviewComment`; `listDocuments` excludes service-evidence documents (worker_service_id set) so "Submitted documents" stays pure identity-verification history |
| `src/modules/workers/workers.service.js` | `addService` now takes an optional file - requires one when the picked service's category is `high_risk` and outside the worker's verified categories, uploads it via the same Cloudinary path as verification docs, and links it to the new worker_services row in a transaction |
| `src/modules/workers/workers.controller.js` / `workers.routes.js` | `POST /me/services` is now multipart (reuses the module's existing multer instance) - an optional `document` field rides alongside `serviceId`/`price` |
| `src/modules/admin/admin.model.js` | `listPendingServices` now also returns `highRisk`/`documentUrl` (the linked evidence doc, if any); `listPendingDocuments` excludes service-linked documents; `decideWorkerService` accepts a rejection `comment` and cascades the decision onto the linked document's status; `setServiceHighRisk` toggle |
| `src/modules/admin/admin.service.js` / `admin.controller.js` / `admin.routes.js` | `decideWorkerService` threads the comment through; `rejectWorkerService` parses it (reuses `AdminDocumentRejectInputSchema`); `PATCH /services/:id/{mark,unmark}-high-risk` |
| `src/db/migrations/023_add_chat_attachments.sql` | Adds `attachment_url`/`attachment_type`/`attachment_name` to `chat_messages`, makes `message` nullable, adds a CHECK requiring at least one of message/attachment |
| `src/modules/chat/chat.model.js` | `chat_messages` CRUD; `create()` now also accepts attachment fields |
| `src/modules/chat/chat.service.js` | `sendMessage` (text) and `sendAttachment` (Cloudinary upload, reusing the same pipeline as verification docs/profile photos) - both notify the other party |
| `src/modules/chat/chat.controller.js` | Route handlers, incl. `sendAttachment` for the new multipart endpoint |
| `src/modules/chat/chat.routes.js` | `POST /:bookingId/messages/attachment` - multer memory storage, fileFilter limited to images + PDF, 10MB cap |
| `src/db/backfillCommissionLedger.js` | One-time (idempotent, safe to re-run) script: finds completed bookings with no `commission_ledger` row and inserts them, recomputing each affected worker's running balance chain in chronological order. Run via `npm run backfill:ledger --workspace apps/api` |
| `src/modules/commissionLedger/commissionLedger.model.js` | SQL for the commission ledger: create on booking completion, latest balance, lifetime/month/week totals (`findTotals`), zero-filled daily/monthly series for charts, paginated transaction history with customer name |
| `src/modules/commissionLedger/commissionLedger.service.js` | Business logic: 15% `COMMISSION_RATE`, `recordCompletion` (called from bookings.service.js), `getSummary`/`getSparkline`/`getSeries`/`getHistory` for the Earnings screen and Dashboard card |
| `src/modules/commissionLedger/commissionLedger.controller.js` | Route handlers for `GET /commission-ledger/me/{summary,sparkline,series,history}` |
| `src/modules/commissionLedger/commissionLedger.routes.js` | Mounts the above under `requireAuth, requireRole('worker')` |

## apps/web
| File | Purpose |
|---|---|
| `src/components/AddServiceModal.jsx` | Worker's "add a service" picker. Default mode groups the catalog by category (alphabetically sorted, matching the API's own order) and only shows the worker's already-verified category(ies), going live immediately. A separate "Add a service from another category" mode shows every other category with an admin-review notice, plus a required document upload when the picked service is `high_risk` |
| `src/screens/WorkerDashboard/WorkerDashboard.jsx` | `ServiceRow` shows a rejected service's `reviewComment` with an inline "Retry" resubmit (price + document if `highRisk`); `handleServiceUpdated` upserts by id (a retry returns the same row, not a new one); passes `approvedCategories` to `AddServiceModal` |
| `src/api/workers.api.js` | `addService` is now always multipart (an optional `document` file rides alongside `serviceId`/`price`) |
| `src/screens/Admin/AdminCategories.jsx` | Adds a per-service "Mark/Unmark high risk" toggle + badge, mirroring the existing Activate/Deactivate pattern. Also fixes a pre-existing bug where `load()` set `categories` to the whole `{categories: [...]}` response instead of unwrapping it, crashing the screen on every visit |
| `src/screens/Admin/AdminApprovals.jsx` | Service-kind pending items now show the same inline rejection-reason input as documents (previously rejected immediately with no reason), plus a `highRisk` badge and a "View supporting document" link when one was submitted |
| `src/api/admin.api.js` | `rejectService(id, comment)` now sends a reason; `markServiceHighRisk`/`unmarkServiceHighRisk` |
| `src/screens/BookingChat/BookingChat.jsx` | In-app chat tied to a booking. Seamless pill composer with a "+" popup (Camera / Attach file, opens the device camera/file picker via hidden `<input type="file">`), a mic icon that swaps to a send arrow once the draft has text (mic just shows a "Voice messages coming soon" toast this round), inline image thumbnails (tap for a full-size viewer) and PDF file chips |
| `src/api/bookings.api.js` | `sendAttachment(bookingId, file)` added - multipart upload to `/bookings/:id/messages/attachment` |
| `src/api/commissionLedger.api.js` | Client for the four `/commission-ledger/me/*` endpoints |
| `src/components/EarningsChart.jsx` | Zero-dependency inline-SVG bar chart, shared by the Dashboard sparkline (`compact`) and the full Earnings range chart |
| `src/screens/WorkerDashboard/WorkerDashboard.jsx` | Worker home screen; includes the compact `EarningsCard` (7-day sparkline, this week's total + jobs count) that links to `/worker/earnings` |
| `src/screens/Earnings/Earnings.jsx` | Full Earnings screen: summary stat row, 7D/30D/All range chart, paginated ("Load more") transaction history with customer/amount/commission/running balance, empty state |

## packages/shared
| File | Purpose |
|---|---|
| `schemas/service.schema.js` | `ServiceSchema` gained `highRisk` |
| `schemas/workerProfile.schema.js` | `WorkerServiceSchema` gained `highRisk`/`reviewComment` |
| `schemas/verificationDocument.schema.js` | `VerificationDocumentSchema` gained `workerServiceId` |
| `schemas/chatMessage.schema.js` | `ChatMessageSchema` - `message` nullable, plus `attachmentUrl`/`attachmentType`/`attachmentName` |
| `schemas/commissionLedger.schema.js` | `CommissionLedgerEntrySchema` - one row of a worker's commission ledger, incl. `customerName` |

## docs
| File | Purpose |
|---|---|
| `WORKING_AGREEMENT.md` | Session ground rules: orient from this index, lightweight-only testing, scope discipline, git workflow, end-of-task checklist |
| `PROJECT_INDEX.md` | This file |
| `SCREENS.md` | Screen inventory by build phase |
| `DATA_MODEL.md` | Full DB schema reference, incl. `commission_ledger` (§11) |
| `DESIGN_SYSTEM.md` | Visual design tokens/patterns for the customer/worker-facing app |
