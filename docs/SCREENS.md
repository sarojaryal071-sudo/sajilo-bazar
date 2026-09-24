# Sajilo Bazar — Screen Inventory

Full feature/screen parity with the old `sajilo-app` frontend, minus the one dropped
feature (admin UI-editing studio). Grouped by build-order phase from `PROJECT_BRIEF.md`.
Build in this order — don't jump ahead to later-phase screens.

## Phase 1 — Auth & Profiles

- Welcome screen
- Login
- Signup (role selection: customer / worker)
- Profile screen (view/edit own profile)
- Worker: "Apply as worker" flow (skills, services, pricing, document upload)
- Worker: verification pending / status screen

## Phase 2 — Manual Booking

- Home screen (customer) — one screen, two states: resting (categories +
  normal home content) and active search (tapping the search bar
  transitions in place - no separate screen/route). Active state shows
  recommended/top-rated workers immediately, then narrows live as the
  customer types (debounced) or taps a category filter chip. The search
  bar lives only at the top of Home - it is not a bottom nav entry; the
  customer bottom nav is Home / Bookings / Profile.
- Worker detail screen — profile, services, price, ratings, "Book" action
- Booking flow / request screen
- Bookings list screen (customer + worker views)
- Booking detail / tracking screen
- In-app chat (tied to a booking)
- Review/rating modal (post-completion)
- Worker: Jobs screen (incoming/active/past bookings)
- Worker: Dashboard (today's jobs, quick stats)

## Phase 3 — Instant Request

- Instant request creation screen (service, description, location)
- Live "waiting for worker" state (customer side)
- Live incoming-request popup/notification (worker side) — accept/decline under time
  pressure
- Booking tracking screen extended with live status for the instant flow

## Phase 4 — Notifications

- Notification inbox/list screen
- Notification bell/badge component (not a full screen — see `DESIGN_SYSTEM.md`)

## Phase 5 — Commission Ledger (worker-facing)

- Worker: Dashboard earnings card — compact snapshot (7-day sparkline, this week's total,
  jobs-completed count) sitting alongside the existing today's-jobs/quick-stats content;
  tapping it navigates to the full Earnings screen
- Worker: Earnings screen (summary row: total lifetime earnings, this month, commission
  owed, credit balance; full range chart - 7D/30D/All; paginated transaction history with
  customer, amount, commission, and running balance per job) — reached via the Dashboard
  card, not a bottom-nav tab
- Worker: Schedule — folded into Jobs, not a separate screen. Jobs already lists a worker's
  bookings by status; a dedicated schedule view is deferred until there's an actual
  date/time-scheduling model to build it around

## Phase 6 — Admin (minimal, no theming)

- Admin dashboard (overview stats)
- Admin: Worker verification queue + detail/approve/reject
- Admin: Users list + detail (customers + workers), suspend/reinstate
- Admin: Bookings list + detail, moderation actions
- Admin: Categories/services management (the `services` table)
- Admin: Support tickets list + detail
- Admin: Disputes list + detail
- Admin: Announcements (simple — platform-wide notices)
- Admin: Policies (simple static content management, not a builder)

## Later phases — not built until their phase starts

- Admin: full financial reporting (P&L, balance sheet, trial balance) — only once
  `commission_ledger` genuinely needs to grow into full accounting (see `DATA_MODEL.md`)
- Admin: expenses/vendors/cost centers
- Admin: staff management + granular roles/permissions (beyond the founder)
- Admin: deeper analytics dashboards, live-ops monitoring, feature-flag management
- Admin: audit log viewer

## Explicitly dropped — do not build

- **Admin UI Control / theming studio** (was `AdminUIControl/*` in the old repo: appearance
  panel, brand editor, colors/spacing/typography/radius panels, live preview workspace,
  publish panel). This entire category is out of scope for Sajilo Bazar.

## Notes for the build session

- Where the old repo had a screen not listed above and you're unsure whether it's in scope,
  ask rather than build it — it may have been part of the UI-theming system or genuinely
  unnecessary scope creep from the old project.
- Admin screens are functional and plain — data tables, forms, status changes. No live
  visual customization of the app's own UI (that's the dropped feature). Applying the
  `DESIGN_SYSTEM.md` visual style to admin screens themselves (making the admin panel look
  good) is fine and expected — the distinction is "admin panel looks professional" vs.
  "admin panel lets you edit how the customer app looks," and only the second is dropped.
