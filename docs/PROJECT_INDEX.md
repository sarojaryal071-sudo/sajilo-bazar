# Project Index

Maintained file-by-file map of the repo. Updated as the last step of every task
(see `docs/WORKING_AGREEMENT.md` §5). A session should be able to orient from this
file alone, without re-reading the whole codebase.

This index is filled in incrementally - only files touched by a task get an entry
here as part of that task. A file with no entry yet doesn't mean it's undocumented
forever, just that no session has touched it since this index was introduced.

_Last updated: 2026-09-24 — Public landing page at `/`_

## apps/api
| File | Purpose |
|---|---|
| `src/db/migrations/028_add_booking_payment_method.sql` | Adds `bookings.payment_method` (`cash` default \| `esewa`, CHECK-constrained) |
| `src/modules/bookings/bookings.model.js` | `toBooking` gains `paymentMethod`; `setCompleted(id, finalPrice, paymentMethod)` now takes both and writes them in the same `UPDATE` that sets `status='completed'`/`completed_at` - overwrites the original estimate with the worker-confirmed final price |
| `src/modules/bookings/bookings.service.js` | `completeBooking(bookingId, workerId, {finalPrice, paymentMethod})` passes both through to `setCompleted`; `commissionLedgerService.recordCompletion` (unchanged) reads the freshly-updated `booking.price`, so the ledger's `job_price` reflects the confirmed final price, not the original estimate |
| `src/modules/bookings/bookings.controller.js` | `complete` now parses `CompleteBookingInputSchema` from the body |
| `packages/shared/schemas/enums.js` | `PAYMENT_METHODS` (`['cash', 'esewa']`) |
| `packages/shared/schemas/booking.schema.js` | `BookingSchema` gains `paymentMethod`; new `CompleteBookingInputSchema` (`finalPrice` positive, `paymentMethod` a literal `'cash'` - `esewa` is rejected server-side even though the enum/column can represent it, since the gateway doesn't exist yet) |
| `src/db/migrations/026_scheduled_booking_and_availability.sql` | Adds `bookings.scheduled_for`/`.response_deadline_hours`/`.respond_by` (all null for an urgent booking); `worker_profiles.typical_response_hours` (self-reported) and `.online_overridden_at` (when the worker last manually toggled online/offline); new `worker_availability_blocks` table (weekly recurring, `day_of_week` 0-6 per JS `Date#getDay()`) |
| `src/db/migrations/027_add_booking_request_expired_notification_type.sql` | Adds `booking_request_expired` to `notifications.type`'s CHECK constraint (same drop/re-add pattern as migration 013) |
| `src/lib/availability.js` | Pure computation, no cron: `computeEffectiveOnline({blocks, manualIsOnline, overriddenAt, now})` - a manual override wins until `nextBoundaryAfter` the block it was set relative to; `isWithinBlock` |
| `src/modules/workers/workers.model.js` | `setOnline` now stamps `online_overridden_at`; new `setIsOnlineFromSchedule` (schedule-driven sync path, doesn't touch the override timestamp), `setTypicalResponseHours`, `listAvailability`/`replaceAvailability` (delete+insert, like `replaceWorkerServices`), `findOnlineOverriddenAt`, `listWorkersWithAvailability`; search/detail queries + `toProfile` gain `typicalResponseHours` |
| `src/modules/workers/workers.service.js` | `syncEffectiveOnline` (recompute+persist if changed, called from `getMyWorkerData` on every dashboard load) and `syncAllWorkersWithAvailability` (run once right before instant-request matching - see bookings.service.js); `getAvailability`/`setAvailability`/`setTypicalResponseHours` |
| `src/modules/workers/workers.controller.js` / `workers.routes.js` | `GET`/`PUT /me/availability`, `PATCH /me/response-time` |
| `src/modules/bookings/bookings.model.js` | `create()` accepts `scheduledFor`/`responseDeadlineHours`, computing and storing `respondBy` (`now() + responseDeadlineHours hours`) in the same INSERT; new `expireOverdueScheduledRequests()` - single indexed `UPDATE ... WHERE status='requested' AND respond_by < now()`, reusing the `declined` status (no new status) with an explanatory `cancel_reason` |
| `src/modules/bookings/bookings.service.js` | `createBooking` validates `respondBy <= scheduledFor` server-side; `sweepExpiredScheduledRequests()` (calls the model sweep + notifies each customer) run at the top of `listBookings`/`getBooking`/`acceptBooking`/`declineBooking`; `createInstantBooking` calls `workersService.syncAllWorkersWithAvailability()` right before matching so a scheduled worker's status is always current at the moment it's read |
| `src/db/migrations/025_trust_score_and_phone_scoping.sql` | Adds `worker_profiles.approved_at` (stamped whenever verification flips to approved - backfilled from `updated_at`) and `.trust_score` (nullable raw 0-100, stored); `bookings.initiated_by` (`worker`\|`customer`, null for admin overrides); `disputes.at_fault` (`worker`\|`customer`\|`none`, null until resolved) |
| `src/modules/trustScore/trustScore.model.js` | `findScoringProfile`, `findRecentReliabilityJobs` (a worker's own terminal jobs only - completed + worker-initiated cancellations, customer-initiated ones fully excluded), `updateTrustScore` |
| `src/modules/trustScore/trustScore.service.js` | Computes the 0-100 score (rating 40% + reliability 30% + tenure 15%, capped at 12mo + disputes 15%, -20/at-fault incident); 30-day grace period (no prior "Newly Joined"/featured-placement mechanism existed anywhere in the codebase - this is new, see the module's own comments); `recomputeAndStore`/`getMyTrustScore` (worker's own full breakdown+tips); `tierForStoredScore` (customer-facing tier only: `building_trust`\|`trusted`\|`highly_trusted`); `checkCancellationEscalation` (rolling-30-job worker-cancellation rate, min 10 jobs, fires a 3-strikes-style ticket once on crossing 15% - see its own comment on the single-call invariant); `checkDisputeEscalation` (rolling-30-day at-fault-worker dispute count, fires at exactly 3, reusing `adminModel.createSupportTicket`) |
| `src/modules/trustScore/trustScore.controller.js` / `trustScore.routes.js` | `GET /trust-score/me` (worker-only) |
| `src/modules/admin/admin.model.js` | `setWorkerVerificationStatus` now stamps `approved_at` on every approval; `resolveDispute` takes `atFault`; `countAtFaultDisputesForWorker`/`countAtFaultDisputesForWorkerRolling30` |
| `src/modules/admin/admin.service.js` | `resolveDispute` forces `atFault` to null for a dismissed outcome, otherwise wires it through and triggers the dispute escalation check + trust recompute when at-fault: worker |
| `src/modules/bookings/bookings.model.js` | `toBooking`/`SELECT_BOOKING` add `initiatedBy` and a conditional `workerPhone` (only while status is `accepted`/`in_progress` - null otherwise, and never selected at all by search/worker-detail); `setCancelled` takes `initiatedBy` |
| `src/modules/bookings/bookings.service.js` | `cancelBooking` records `initiatedBy` and only triggers the cancellation-escalation check + trust recompute for worker-initiated cancellations; `createDispute` is filable on `accepted`/`in_progress`/`completed` bookings (not `requested`/`cancelled`/`declined`) - the 24-hour filing cutoff only applies once `completedAt` is set, so an active booking has no deadline at all (a worker who never shows up, or a mid-job safety issue, needs to be reportable immediately); `completeBooking` recomputes trust score |
| `src/modules/reviews/reviews.service.js` | `createReview` recomputes the worker's trust score after a new review moves `rating_avg` |
| `src/modules/workers/workers.model.js` | `searchWorkers`/`findApprovedWorkerDetail` now also select the raw `trust_score` internally (never the phone) - `workers.service.js` maps it to `trustTier` and strips the raw number before the response leaves the module |
| `src/modules/workers/workers.service.js` | `withTrustTier` - the one place the raw stored score turns into the customer-facing tier and gets deleted |
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
| `src/screens/Landing/Landing.jsx` | New public marketing page at `/` - one universal page (no persona-split content), replaces the old minimal `Welcome` screen at the same route (deleted, no longer referenced anywhere). Same auth-redirect logic as before: `loading` → `FullScreenSpinner`, logged-in user → their dashboard (unchanged). Sections: sticky header (wordmark, in-page anchor nav, Sign up/Log in), hero, "the idea", How it works (4 steps), Trust & Safety (4 points), About/status (no city, no pricing/commission - not public information), footer (Sign up/Log in again + a contact line). Sign up/Log in route to the existing `/signup`/`/login` screens - no new auth UI. Built entirely from existing shared components/tokens (`Card`, `Button`, the same `bg-brand` gradient and glow-blur treatment `AuthScreen.jsx` uses) - no new "marketing" visual language |
| `src/App.jsx` | `/` now renders `Landing` instead of `Welcome` |
| `src/components/Skeleton.jsx` | New shared loading primitives: `SkeletonBlock` (pulsing `bg-border` block - not `bg-surface-alt`, which is nearly indistinguishable from the page background and was invisible in practice), `Spinner`, `FullScreenSpinner` (full-viewport centered spinner, for spots with no known destination-screen shape to mimic) |
| `src/components/ProtectedRoute.jsx` | `if (loading) return null` → `<FullScreenSpinner />` - this gate runs before every authenticated screen mounts, so it was the single biggest source of the blank-screen flash on cold load/refresh |
| `src/components/AppShell.jsx` / `src/components/AdminShell.jsx` | Same auth-gate fix as `ProtectedRoute.jsx` (both have their own separate `loading` check) |
| ~~`src/screens/Welcome/Welcome.jsx`~~ | Had the same auth-gate fix as the row above, but the file itself is since deleted - superseded by `src/screens/Landing/Landing.jsx` (see the newer entry above), which carries the same loading/redirect logic forward |
| `src/screens/WorkerDetail/WorkerDetail.jsx`, `src/screens/BookingRequest/BookingRequest.jsx`, `src/screens/BookingDetail/BookingDetail.jsx`, `src/screens/Earnings/Earnings.jsx`, `src/screens/WorkerDashboard/WorkerDashboard.jsx` | `if (!data) return null` → a per-screen skeleton (`SkeletonBlock`s roughly matching that screen's real layout: back button + avatar/header row + a couple of content-card blocks) instead of a blank screen while the initial fetch is in flight |
| `src/screens/WorkerAvailability/WorkerAvailability.jsx` | New screen: weekly availability blocks (day + start/end time, add/remove, replace-all save) and the optional "usually replies within Xh" field. Linked from WorkerDashboard's online toggle |
| `src/api/workers.api.js` | `getAvailability`/`setAvailability`/`setTypicalResponseHours` |
| `src/api/bookings.api.js` | `create()` takes optional `scheduledFor`/`responseDeadlineHours` - both omitted (not sent as null) for an urgent booking |
| `src/screens/BookingRequest/BookingRequest.jsx` | Now/"Schedule for later" mode toggle - schedule mode adds a `datetime-local` picker (min 5 minutes out) and a 1/6/24h response-deadline preset picker, both required together |
| `src/screens/WorkerDetail/WorkerDetail.jsx` | Shows `typicalResponseHours` ("Usually replies within Xh") when the worker has set one |
| `src/components/BookingListItem.jsx` | Shows "Scheduled for ..." when `booking.scheduledFor` is set |
| `src/screens/BookingDetail/BookingDetail.jsx` | Shows scheduled date/time + (while `requested`) the response-deadline "Respond by" time |
| `src/lib/notificationText.js` | `booking_request_expired` copy ("Scheduled request expired...") |
| `src/lib/geolocation.js` | `getCurrentLocation` now distinguishes `PERMISSION_DENIED` from other errors (position-unavailable/timeout get their own message rather than the misleading "allow it and try again" one); adds `getGeolocationPermissionState()` (wraps `navigator.permissions.query({name:'geolocation'})`, falls back to `'unknown'` where unsupported) and `getLocationBlockedMessage()` (platform-aware - iOS gets Settings-app instructions, everyone else gets site-settings instructions) |
| `src/screens/WorkerDashboard/WorkerDashboard.jsx` | `OnlineToggle`'s `handleChange` checks the geolocation permission state before going online - `'denied'` short-circuits straight to `getLocationBlockedMessage()` (the browser won't re-prompt on its own); `'prompt'`/`'unknown'` still call `getCurrentLocation()`, which is what triggers the native permission popup |
| `src/components/TrustMeter.jsx` | Worker's own full trust-score panel (WorkerDashboard) - meter, per-factor breakdown, actionable tips; shows a grace-period notice instead while `inGracePeriod` |
| `src/components/TrustBadge.jsx` | Customer-facing simplified tier badge + 3-segment meter only - no raw number, breakdown, or dispute count. Used on WorkerDetail and WorkerCard (search results) |
| `src/api/trustScore.api.js` | `getMyTrustScore()` - `GET /trust-score/me` |
| `src/screens/Admin/AdminDisputeDetail.jsx` | Resolve form gains an at-fault selector (worker/customer/neither), shown only for a `resolved` outcome; displays the recorded `atFault` once decided |
| `src/screens/BookingDetail/BookingDetail.jsx` | Shows the worker's phone (tap-to-call) to the customer only when `booking.workerPhone` is present (accepted/in_progress) |
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
| `src/lib/bookingStatus.js` | Adds `NO_WORKER_TERMINAL_STATUSES` (`['cancelled', 'declined']`) - a terminal status with no worker ever assigned (an unclaimed instant request, or a scheduled request that auto-expired) |
| `src/components/NoWorkerAvatar.jsx` | New: muted person-icon avatar for the no-worker-ever-assigned case, distinct from `Avatar.jsx`'s brand-colored fallback which reads as "actively searching" |
| `src/components/BookingListItem.jsx` | Shows "No worker found" + `NoWorkerAvatar` instead of "Finding a worker..." + brand avatar once the booking is terminal (`NO_WORKER_TERMINAL_STATUSES`) with no worker ever assigned; a terminal booking that did have a worker is unaffected |
| `src/screens/BookingDetail/BookingDetail.jsx` | Same "No worker found" / `NoWorkerAvatar` fix applied to the detail header |
| `src/screens/BookingDetail/BookingDetail.jsx` | New `CompleteSection` - the worker's "Mark complete" step now opens an inline form (final price input, prefilled/editable; Cash selected, eSewa disabled with a "Coming soon" badge) instead of completing immediately; the details card gains a "Payment method" row ("Paid in cash") once `status === 'completed'`, visible to both roles |
| `src/api/bookings.api.js` | `complete(id, {finalPrice, paymentMethod})` now sends a body instead of a bare PATCH |

## packages/shared
| File | Purpose |
|---|---|
| `schemas/availability.schema.js` | `AvailabilityBlockSchema` (`dayOfWeek` 0-6, `startTime`/`endTime` as `HH:MM`), `AvailabilityReplaceInputSchema`, `TypicalResponseHoursInputSchema` |
| `schemas/enums.js` | `RESPONSE_DEADLINE_HOURS` (`[1, 6, 24]`); `NOTIFICATION_TYPES` gained `booking_request_expired` |
| `schemas/booking.schema.js` | `BookingSchema` gained `scheduledFor`/`responseDeadlineHours`/`respondBy`; `BookingCreateInputSchema` gained optional `scheduledFor`/`responseDeadlineHours` (must be given together, `scheduledFor` must be in the future) |
| `schemas/workerProfile.schema.js` | `WorkerProfileSchema` gained `typicalResponseHours` |
| `schemas/workerSearch.schema.js` | `WorkerSearchResultSchema`/`WorkerDetailSchema` gained `typicalResponseHours` |
| `schemas/trustScore.schema.js` | `TrustScoreSchema` - worker's own panel only (score/breakdown/tips, null while in grace period) |
| `schemas/enums.js` | `TRUST_TIERS` (`building_trust`\|`trusted`\|`highly_trusted`) |
| `schemas/workerSearch.schema.js` | `WorkerSearchResultSchema`/`WorkerDetailSchema` gained `trustTier` (tier only, never the raw score) |
| `schemas/booking.schema.js` | `BookingSchema` gained `workerPhone` (present only for an accepted/in_progress booking) |
| `schemas/admin.schema.js` | `AdminDisputeResolveInputSchema` gained `atFault` |
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
