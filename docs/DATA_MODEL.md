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

## 3. `services`

Catalog of service types (replaces `professions` + `profession_services`).

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| category | text | e.g. `plumbing`, `electrical`, `cleaning` |
| name | text | e.g. "Pipe leak repair" |
| description | text | nullable |

## 4. `worker_services`

A worker's offered services and their price for each (replaces `worker_professions` +
`worker_services` + `worker_job_size_ranges`).

A worker can add more services after signup beyond what they registered with, but only by
picking from the existing `services` catalog - never free-text. Adding one in the same
category as an already-approved service goes live immediately (`approval_status = approved`);
a different category needs admin review (`pending`) before it's bookable or visible to
customers, since it's outside what verification originally vetted. Mirrors
`verification_documents`' approve/reject pattern rather than inventing a new one. The
admin review screen for the pending queue is Phase 6 work - for now a pending row just stays
correctly hidden from search/booking.

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

## 5. `verification_documents`

Replaces `worker_verifications` + `verification_documents` + `verification_reviews` +
`worker_documents` — status lives on the document row itself.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → worker_profiles | |
| doc_type | text | e.g. `id_card`, `certificate` |
| file_url | text | Cloudinary URL |
| status | text | `pending` \| `approved` \| `rejected` |
| reviewed_by | fk → users | nullable, admin who reviewed |
| reviewed_at | timestamptz | nullable |

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

---

## Deferred — add only when the phase that needs them starts (Phase 6+)

Do not build these until `PROJECT_BRIEF.md`'s build order reaches them:

- `support_tickets`, `support_attachments`, `disputes`, `dispute_evidences` — Phase 6
- `audit_logs` — once there's staff other than the founder making changes worth auditing
- Full double-entry accounting (`accounts`, `accounting_entries`, `account_mapping_rules`,
  `expenses`, `vendors`, `cost_centers`, etc.) — only if `commission_ledger` genuinely stops
  being sufficient, likely well past MVP
- `roles_and_permissions`, `staff_profiles` — `users.role` is enough until there's a support
  team beyond the founder

**Explicitly dropped, not deferred:** `ui_configurations`, `ui_design_tokens`, `ui_config` —
the admin UI-theming system. Not part of this product.
