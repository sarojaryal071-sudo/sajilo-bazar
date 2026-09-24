# Sajilo Bazar — Data Model

Lean schema for Phases 1–6 (see `PROJECT_BRIEF.md` build order). This replaces the old
project's ~45-table schema — see the project's business-plan doc for the full before/after
reasoning. Add tables only when a phase actually needs them; don't pre-build for later
phases.

Conventions: `id` = `SERIAL PRIMARY KEY` unless noted. Timestamps: `created_at TIMESTAMPTZ
DEFAULT now()` on every table; add `updated_at` where rows are mutated after creation.

## 1. `users`

Core identity for customers, workers, and admins.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| role | text | `customer` \| `worker` \| `admin` |
| full_name | text | |
| phone | text | unique, primary login identifier |
| email | text | unique, nullable |
| password_hash | text | |
| moderation_status | text | `active` \| `suspended`, default `active` |
| settings | jsonb | user preferences — replaces the old separate `user_settings` table |
| admin_notes | text | nullable — free-text, editable by any admin from the Users detail screen (Phase 6) |
| created_at | timestamptz | |

## 2. `worker_profiles`

One row per user with `role = worker`.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| user_id | fk → users | unique |
| bio | text | nullable |
| is_online | boolean | default false — drives instant-request matching |
| current_lat / current_lng | numeric | nullable — last known location |
| verification_status | text | `pending` \| `approved` \| `rejected`, default `pending` |
| rating_avg | numeric | denormalized, updated on new review |
| jobs_completed_count | int | denormalized |
| approved_at | timestamptz | nullable - stamped every time `verification_status` flips to `approved` (including a re-approval), not just the first time. Trust score's grace period (see below) is measured from here. No prior mechanism for this existed anywhere in the codebase - migration 025 backfills it from `updated_at` for workers already approved beforehand |
| trust_score | numeric | nullable - the stored raw 0-100 trust score (see "Trust score" below); null while the worker is within the 30-day grace period after `approved_at` or otherwise not yet scoreable |

## 3. `services`

Catalog of service types (replaces `professions` + `profession_services`).

`high_risk` is admin-editable data (toggled per service from the Categories/Services
admin screen), not hardcoded by category - it gates whether a worker adding this service
from outside their verified category(ies) must submit a supporting document (see
`worker_services` below). Seeded `true` only for `electrical` at migration time - the
catalog's plumbing services aren't gas-related, so blanket-flagging all of plumbing would
misrepresent the actual work; admin can flip it per service at any time.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| category | text | e.g. `plumbing`, `electrical`, `cleaning` |
| name | text | e.g. "Pipe leak repair" |
| description | text | nullable |
| high_risk | boolean | default false |

## 4. `worker_services`

A worker's offered services and their price for each (replaces `worker_professions` +
`worker_services` + `worker_job_size_ranges`).

A worker can add more services after signup beyond what they registered with, but only by
picking from the existing `services` catalog - never free-text. Adding one in the same
category as an already-approved service goes live immediately (`approval_status = approved`);
a different category needs admin review (`pending`) before it's bookable or visible to
customers, since it's outside what verification originally vetted - if that category is
`high_risk`, a supporting document is also required up front (see `verification_documents`
below). Mirrors `verification_documents`' approve/reject pattern rather than inventing a new
one, including the same rejection-reason/retry experience (`review_comment`). Retrying a
rejected service re-submits through the same `(worker_id, service_id)` row (upsert), which
resets `approval_status`/`reviewed_by`/`reviewed_at`/`review_comment` - it isn't a new
request, just a fresh attempt at the same one.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → worker_profiles | |
| service_id | fk → services | |
| price | numeric | worker's stated price |
| is_active | boolean | default true |
| approval_status | text | `pending` \| `approved` \| `rejected`, default `approved` |
| reviewed_by | fk → users | nullable, admin who reviewed |
| reviewed_at | timestamptz | nullable |
| review_comment | text | nullable - admin's reason, set on reject |

## 5. `verification_documents`

Replaces `worker_verifications` + `verification_documents` + `verification_reviews` +
`worker_documents` — status lives on the document row itself.

`worker_service_id` is set only when this document is supporting evidence for a specific
high-risk cross-category service request (`docType = 'service_evidence'`) rather than the
worker's original identity verification - nullable, and every other document (the
worker-apply flow's documents) leaves it null. A document tied to a service request is
surfaced in the admin Approvals queue alongside that service request rather than as a
separate item, and its status/reviewer are set together with the service's when an admin
decides it (see `admin.model.js` `decideWorkerService`).

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → worker_profiles | |
| doc_type | text | e.g. `id_card`, `certificate`, `service_evidence` |
| file_url | text | Cloudinary URL |
| status | text | `pending` \| `approved` \| `rejected` |
| reviewed_by | fk → users | nullable, admin who reviewed |
| reviewed_at | timestamptz | nullable |
| review_comment | text | nullable - admin's reason, set on reject |
| worker_service_id | fk → worker_services | nullable - see above |

## 6. `bookings`

Replaces `bookings` + `booking_cancellations` (cancellation fields folded in).

A booking can cover multiple services in one job (see `booking_services` below) - a customer
picking several things from the same worker creates one booking, not one per service. `price`
is kept as a denormalized sum of `booking_services.price` rather than dropped: computing it
on every read would mean rewriting every existing consumer of `booking.price` (booking lists,
detail screens, notification text) to join and sum instead. It's written once at booking
creation (manual) or at claim time (instant, once a worker's prices are known) and never
otherwise mutated, so staleness isn't a real risk.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| type | text | `manual` \| `instant` |
| customer_id | fk → users | |
| worker_id | fk → users | nullable until assigned (instant flow) |
| status | text | `requested` \| `accepted` \| `in_progress` \| `completed` \| `cancelled` |
| price | numeric | nullable; denormalized sum of this booking's `booking_services.price` (see above) |
| address | text | |
| lat / lng | numeric | |
| cancelled_by | fk → users | nullable |
| cancel_reason | text | nullable |
| initiated_by | text | nullable — `worker` \| `customer`, set on cancellation. Null for a booking cancelled by an admin override (`adminCancelBooking`) or for any row predating migration 025. Only a `worker` value feeds the rolling-30-job cancellation rate/escalation and the trust score's reliability component - a `customer` value is logged and tied to the worker but doesn't affect either (see "Trust score" below) |
| flagged | boolean | default false — lightweight admin moderation marker (Phase 6), not a full dispute record |
| flag_reason | text | nullable |
| created_at / completed_at | timestamptz | |

## 6a. `booking_services`

Join table between a booking and the services it covers - one row per service selected,
replacing the old single `bookings.service_id` column.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | `ON DELETE CASCADE` |
| service_id | fk → services | `ON DELETE RESTRICT` |
| price | numeric | nullable; unique per `(booking_id, service_id)` |

`price` is nullable at the row level because an instant request doesn't know which worker
(and therefore which price) it will land with until a worker claims it - manual bookings
populate every row's price immediately at creation, instant bookings populate it at claim
time once the claiming worker's own prices for those services are looked up.

## 7. `booking_offers`

Tracks the broadcast/instant-request fan-out — who was notified, who accepted.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | |
| worker_id | fk → users | |
| notified_at | timestamptz | |
| responded_at | timestamptz | nullable |
| response | text | nullable — `accepted` \| `declined` \| `expired` |

## 8. `chat_messages`

One row per message, tied directly to a booking — no separate conversation object. A
message is text, an attachment (image or PDF, via the same Cloudinary pipeline as
verification documents/profile photos), or both - `message` is nullable and a CHECK
constraint (`chat_messages_has_content`, migration 023) requires at least one of
`message`/`attachment_url`. Attachments persist on the row like any other message
field, not a transient upload preview - disputes reusing the booking's chat transcript
as evidence (business plan §7) retrieve them the same way as regular messages.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | |
| sender_id | fk → users | |
| message | text | nullable - see above |
| attachment_url | text | nullable - Cloudinary `secure_url` |
| attachment_type | varchar(10) | nullable - `image` \| `pdf` |
| attachment_name | varchar(255) | nullable - original filename (shown on the PDF file chip) |
| created_at | timestamptz | |

## 9. `reviews`

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | unique |
| rating | int | 1–5 |
| comment | text | nullable |
| created_at | timestamptz | |

## 10. `notifications`

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| user_id | fk → users | |
| type | text | e.g. `new_request`, `booking_accepted`, `chat_message` |
| payload | jsonb | |
| read_at | timestamptz | nullable |
| created_at | timestamptz | |

## 11. `commission_ledger`

The platform's accounting at MVP scale: a running balance, not double-entry bookkeeping.
One row is inserted per booking when it completes; `credit_balance_after` is negative when
the worker owes the platform, which is the normal state until Phase 8 adds in-app payment -
until then the worker collects the full job price directly from the customer, so each
completed job books a commission debt rather than draining a prepaid credit. The commission
rate itself (currently a flat 15%, `COMMISSION_RATE` in
`apps/api/src/modules/commissionLedger/commissionLedger.service.js`) isn't specified anywhere
in the product docs - it's a placeholder pending an actual business decision.

Because a row is only ever inserted at the moment of completion, any booking that reached
`completed` status before this table (or its insert call in `bookings.service.js`) existed
has no ledger row and never will on its own. Run
`npm run backfill:ledger --workspace apps/api` (`apps/api/src/db/backfillCommissionLedger.js`)
once against any environment carrying pre-existing completed bookings - safe to re-run,
skips anything already backfilled.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → users | |
| booking_id | fk → bookings | unique - one entry per completed booking |
| job_price | numeric | worker-confirmed final price |
| commission_amount | numeric | platform's cut |
| credit_balance_after | numeric | worker's running balance after this entry; negative = owed to the platform |
| created_at | timestamptz | |

## 12. `disputes`

Built in the admin panel's Round C (Phase 6), predating this file's last full pass - documented
properly here now since the trust-score task extends it. A customer/worker can self-report via
a booking's own detail screen (`bookings.service.js` `createDispute`) or an admin can log one on
a party's behalf; either way it lands in this one table. Self-service filing has a hard cutoff -
only within 24 hours of the booking's `completed_at` (enforced on the endpoint itself) - the
admin-logged path has no such cutoff, since an admin may need to log an older case.

`at_fault` is only meaningful once `status = 'resolved'` (a `dismissed` dispute has no fault
finding, so the service layer forces it to null regardless of what's sent). Only an at-fault
`worker` finding feeds anything downstream: 3 of them within a rolling 30 days trigger the same
support-ticket escalation pattern documented below, and every at-fault `worker` dispute
(all-time) deducts from the trust score's dispute-free-record component (see "Trust score"
below).

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | |
| raised_by | fk → users | |
| reason | text | |
| status | text | `open` \| `resolved` \| `dismissed`, default `open` |
| at_fault | text | nullable - `worker` \| `customer` \| `none`, set (or forced null) on resolution - see above |
| resolution_notes | text | nullable |
| resolved_by | fk → users | nullable |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | |

## 13. `support_tickets` / `support_ticket_messages`

Also built in Round C, documented here for the same reason as `disputes` above. The admin
review queue every escalation in this codebase auto-opens into (worker-verification rejections,
and now the trust score's cancellation-rate and dispute-count escalations) - never an automatic
suspension, always a ticket a human picks up.

| Column (`support_tickets`) | Type | Notes |
|---|---|---|
| id | serial pk | |
| user_id | fk → users | |
| booking_id | fk → bookings | nullable |
| subject | text | |
| priority | text | `low` \| `normal` \| `high`, default `normal` |
| status | text | `open` \| `in_progress` \| `resolved` \| `closed`, default `open` |
| created_at / updated_at | timestamptz | |

`support_ticket_messages` is a simple threaded reply log (`ticket_id`, `sender_id`, `message`,
`created_at`) - the ticket's opening message is inserted the same way as any reply.

## Trust score

Worker-facing 0-100 score (`worker_profiles.trust_score`), computed and persisted by
`apps/api/src/modules/trustScore/trustScore.service.js`. The four weights below are locked by
the business plan; everything else here (the grace period length, the internal curves, the
escalation thresholds) is this task's own judgment call, not a business-plan number - see the
module's comments for the reasoning behind each.

- **Rating (40%)** - `worker_profiles.rating_avg` normalized to 0-100.
- **Reliability (30%)** - `1 - cancellationRate`, where `cancellationRate` reuses the same
  rolling-30-job worker-cancellation-rate computation described under `bookings.initiated_by`
  above (a worker with fewer than 10 qualifying jobs simply isn't penalized yet, rather than
  gated to zero).
- **Tenure (15%)** - scales with months since `approved_at`, capped at 12 months.
- **Dispute-free record (15%)** - starts at 100, -20 per all-time at-fault-`worker` dispute.

A worker within 30 days of `approved_at` (or with no `approved_at` at all) is in the grace
period - no prior "Newly Joined"/featured-placement grace-period mechanism existed anywhere in
the codebase to reuse (searched thoroughly), so this is new; 30 days was picked to stay
consistent with the other rolling-30 windows the same spec already uses (the cancellation rate
and dispute count above). `trust_score` stays null for the whole grace period.

Recomputed and re-persisted at the points that can actually move it: a booking completing, a
worker-initiated cancellation, an at-fault-`worker` dispute resolution, and a new review (moves
`rating_avg`) - plus once more, live, whenever the worker's own panel (`GET /trust-score/me`)
is fetched, so they never see a stale number.

**Surfaces:**
- Worker's own panel (`GET /trust-score/me`, `TrustScoreSchema`) - the full score, the
  per-factor breakdown, and a short actionable tip for whichever factor is weakest.
- Customer-facing (`trustTier` on `WorkerSearchResultSchema`/`WorkerDetailSchema`) - one of
  `building_trust` \| `trusted` \| `highly_trusted` only. Never the raw number, the breakdown,
  or a dispute count - `workers.service.js`'s `withTrustTier` is the one place the raw stored
  score turns into this tier and gets deleted before the response leaves the module.

Not built in this task (explicitly separate scope, per the task spec): wiring `trust_score`
into search/Home ranking order. The column is stored precisely so that later task can `ORDER BY`
it without recomputing per request.

## Phone-number visibility scoping

A worker's raw phone number (`users.phone`) was never actually selected by the search or
worker-detail queries to begin with (confirmed by reading `workers.model.js` before this task) -
so "remove it from the public profile and search/browse" required no change there. What this
task added is the one place it *is* now exposed: `bookings.workerPhone`
(`BookingSchema`) - present only while a booking's `status` is `accepted` or `in_progress`
(i.e. the worker has accepted and the job hasn't been marked completed yet), null at every other
status. It's part of the same booking shape returned by both the detail endpoint and a user's
own booking list, which is safe since both are already scoped to bookings the requesting user
is a party to (never a stranger's booking, never a public/search response).

---

## Deferred — add only when the phase that needs them starts (Phase 6+)

Do not build these until `PROJECT_BRIEF.md`'s build order reaches them:

- `support_attachments`, `dispute_evidences` — `disputes`/`support_tickets` themselves are
  already built (§12-13 above); these two attachment tables aren't - a dispute currently reuses
  its booking's own `chat_messages` transcript as evidence instead (business plan §7)
- `audit_logs` — once there's staff other than the founder making changes worth auditing
- Full double-entry accounting (`accounts`, `accounting_entries`, `account_mapping_rules`,
  `expenses`, `vendors`, `cost_centers`, etc.) — only if `commission_ledger` genuinely stops
  being sufficient, likely well past MVP
- `roles_and_permissions`, `staff_profiles` — `users.role` is enough until there's a support
  team beyond the founder

**Explicitly dropped, not deferred:** `ui_configurations`, `ui_design_tokens`, `ui_config` —
the admin UI-theming system. Not part of this product.
