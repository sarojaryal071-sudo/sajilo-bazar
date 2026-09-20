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

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → worker_profiles | |
| service_id | fk → services | |
| price | numeric | worker's stated price |
| is_active | boolean | default true |

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

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| type | text | `manual` \| `instant` |
| customer_id | fk → users | |
| worker_id | fk → users | nullable until assigned (instant flow) |
| service_id | fk → services | |
| status | text | `requested` \| `accepted` \| `in_progress` \| `completed` \| `cancelled` |
| price | numeric | nullable until worker confirms final price on completion |
| address | text | |
| lat / lng | numeric | |
| cancelled_by | fk → users | nullable |
| cancel_reason | text | nullable |
| created_at / completed_at | timestamptz | |

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

One row per message, tied directly to a booking — no separate conversation object.

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| booking_id | fk → bookings | |
| sender_id | fk → users | |
| message | text | |
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

| Column | Type | Notes |
|---|---|---|
| id | serial pk | |
| worker_id | fk → users | |
| booking_id | fk → bookings | |
| job_price | numeric | worker-confirmed final price |
| commission_amount | numeric | platform's cut |
| credit_balance_after | numeric | worker's running prepaid balance after this entry |
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
