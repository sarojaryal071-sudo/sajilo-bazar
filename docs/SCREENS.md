# Sajilo Bazar — Screen Inventory

Full feature/screen parity with the old `sajilo-app` frontend, minus the one dropped
feature (admin UI-editing studio). Grouped by build-order phase from `PROJECT_BRIEF.md`.
Build in this order — don't jump ahead to later-phase screens.

## Phase 1 — Auth & Profiles

- Public Landing screen (`/`) — not part of the original phase numbering, added later as a
  public marketing entry point. Replaces the old minimal Welcome screen at the same route:
  unauthenticated visitors get a full page (header, hero, "how it works", trust & safety,
  about, footer) with Sign up/Log in CTAs routing to the real signup/login screens below; a
  logged-in visitor hitting `/` still redirects straight to their dashboard, same as before.
  One universal page, no persona-split content, no business-model internals (pricing/
  commission) - see `docs/PROJECT_INDEX.md` for the file. Its footer links to the two
  public legal pages below. The hero's brand illustration is a full-bleed background
  filling the entire hero section edge to edge (no boxed image) - a responsive
  `<picture>` (tighter vertical crop on mobile, full wide frame on desktop), preloaded
  since it's above the fold, with the headline/subtext/CTAs in white sitting directly on
  top of it over a radial brand-gradient overlay for legibility.
- Legal pages (`/terms`, `/privacy`) — public, unauthenticated, plain long-form pages
  rendering the platform's actual Terms & Conditions and Privacy Policy (full text, not a
  marketing surface - simpler styling than the rest of Landing). Linked from the Landing
  footer.
- Login — phone+password form, plus "Continue with Google" (Google Identity Services;
  renders nothing if `VITE_GOOGLE_CLIENT_ID` isn't set - no real OAuth client configured in
  this environment yet), a "Keep me logged in" checkbox (longer-lived token instead of the
  default expiry), and a "Forgot password?" link. The shared `AuthScreen` shell's brand
  illustration is a full-bleed background behind the entire screen (all viewport widths,
  not just desktop) with a radial brand-gradient overlay so the glass card floats on
  legible, consistent color while the photo still shows at the edges
- Signup (role selection: customer / worker) — same "Continue with Google" option once a
  role is picked. A brand-new Google sign-in (no matching account by google_id or verified
  email) is prompted for a required phone number (shared `GooglePhoneRoleForm` component,
  used by both Login and Signup) before the account is actually created - phone is the
  platform's core identifier (trust score, booking, phone-privacy scoping). No SMS/OTP
  verification of it yet (deferred to a later round - `phone_verified` stays `false`,
  same as a phone+password signup)
- Forgot password (`/forgot-password`) — phone number + new password + confirm, no OTP/
  email/admin verification of ownership. Deliberately open for this testing/pre-launch
  phase (business-accepted, documented decision) - resets the password and logs the user
  in immediately. Also how a Google-only account (no password yet) gains its first one
- Profile screen (view/edit own profile) — for a worker, also shows their role/verification-
  status badges, member-since date, worker handle, a link to their own public worker
  profile once approved, their submitted verification documents (moved here from the
  worker Dashboard, which stays daily-activity-only), and their full Trust score panel
  (moved here from the worker Dashboard for the same reason — not a daily-activity metric)
- Settings screen (`/settings`) — Account (change password, Connected Google account once
  Google login is configured, Deactivate account [reversible — logging back in undoes it],
  Delete account [irreversible in-app data deletion request per the Privacy Policy —
  anonymizes PII, keeps booking/dispute history anonymized, requires typing "DELETE" to
  confirm]), Preferences (language/theme — moved here from the hamburger menu, which is
  now pure navigation), Locations (customer only — saved addresses, add/edit/delete, set
  which one is the default Home Location; see "Customer home location" below), Notifications
  (channel switcher at top — In-app / SMS / Email / WhatsApp — selecting a channel swaps
  which channel's settings the 5 category toggles below reflect, rather than showing all
  channels side by side; only In-app is functional in this v1, selecting SMS/Email/WhatsApp
  shows the same 5 toggles disabled with a "Coming soon" note for that channel), Support
  (contact support, Terms & Conditions, Privacy Policy)
- Worker: "Apply as worker" flow (skills, services, pricing, document upload)
- Worker: verification pending / status screen
- Customer signup's final step: set a Home Location (address + optional "Use my current
  location") — see "Customer home location" below. Skippable; not shown to workers, and not
  shown to an existing account logging in via Google (only a genuinely new signup)

## Phase 2 — Manual Booking

- Home screen (customer) — one screen, two states: resting (categories +
  normal home content) and active search (tapping the search bar
  transitions in place - no separate screen/route). Active state shows
  recommended/top-rated workers immediately, then narrows live as the
  customer types (debounced) or taps a category filter chip. The search
  bar lives only at the top of Home - it is not a bottom nav entry; the
  customer bottom nav is Home / Bookings / Profile.
- Worker detail screen — profile, services, price, ratings, "Book" action, trust badge,
  and "usually replies within Xh" when the worker has set one (see business plan §13
  section below)
- Booking flow / request screen — Now/"Schedule for later" mode toggle at the top
  (business plan §13); schedule mode adds a date/time picker and a 1/6/24h
  response-deadline preset picker, both required together. Available directly from any
  worker's profile, the same entry point as an urgent booking - not gated to
  unmatched/broadcast-fallback workers. Location is chosen via the same Uber-style
  picker as the instant flow (see "Customer home location" below) rather than a plain
  free-text field
- Bookings list screen (customer + worker views)
- Booking detail / tracking screen
- In-app chat (tied to a booking) — single seamless composer bar (not the
  neumorphic auth-only style): a "+" on the left expands a small popup with
  Camera and Attach file (Messenger-style, not laid out inline in the bar);
  where send sits, a mic icon shows when the text field is empty and swaps
  to a send arrow the instant typing starts - tapping the mic currently
  just shows a "Voice messages coming soon" toast, actual voice recording
  is a later round. Photo/PDF attachments (images + PDF, 10MB cap) reuse
  the Cloudinary pipeline and persist on the chat message row itself (not
  a transient preview), since disputes reuse the booking's chat transcript
  as evidence. An image renders as an inline thumbnail (tap for full-size);
  a PDF renders as a file chip with name, tap-to-open.
- Review/rating modal (post-completion)
- Worker: Jobs screen (incoming/active/past bookings)
- Worker: Dashboard (today's jobs, quick stats)

## Phase 3 — Instant Request

- Instant request creation screen (service, description, location — the same
  `AddressPicker` as the manual flow; see "Customer home location" below)
- Live "waiting for worker" state (customer side)
- Live incoming-request popup/notification (worker side) — accept/decline under time
  pressure
- Booking tracking screen extended with live status for the instant flow

## Phase 4 — Notifications

- Notification inbox/list screen (Alerts, `/notifications`) — the single unified activity
  feed across every notification type (booking-lifecycle events, chat messages, admin
  notifications, dispute resolutions, support-ticket replies, reviews), newest first; this
  is the only place read/unread state is set. A published admin `type='notification'`
  publication (see Phase 6 below) fans out as a real notification here to every matching
  customer/worker; tapping one opens the full text in a modal rather than the generic
  booking-navigate fallback
- Notification bell/badge component (not a full screen — see `DESIGN_SYSTEM.md`). Decided
  2026-09-25: this badge is the only unread-notification signal anywhere outside Alerts —
  there is no separate Home/Dashboard notification card of any kind (an earlier round briefly
  had one, `NotificationSummaryCard`; it was removed as redundant with this badge)
- Home/Dashboard promotion carousel (`PromotionCarousel`, not a full screen) — renders every
  live admin `type='promotion'` publication for that viewer's role: 0 live promotions renders
  nothing, exactly 1 is a single full-width card, 2+ is a horizontally scrollable row of
  cards. Purely a merchandising surface — a promotion publish never touches
  notifications/Alerts at all, and this carousel never reflects unread-notification state
  (that's the bell badge's job, above)

## Phase 5 — Commission Ledger (worker-facing)

- Worker: Dashboard earnings card — compact snapshot (7-day sparkline, this week's total,
  jobs-completed count) sitting alongside the existing today's-jobs/quick-stats content;
  tapping it navigates to the full Earnings screen
- Worker: Earnings screen (summary row: total lifetime earnings, this month, commission
  owed, credit balance; a disabled "Top Up" placeholder directly below - the real top-up
  mechanism (cash to an agent, bank transfer, etc.) is still an open business decision, not
  built; full range chart - 7D/30D/All; paginated transaction history with customer, amount,
  commission, and running balance per job, i.e. the credit balance's debit ledger) — reached
  via the Dashboard card, not a bottom-nav tab
- Worker: Schedule — still folded into Jobs, not a separate "calendar" screen; a scheduled
  booking shows up in the same Jobs list as any other, with its scheduled date/time and
  response deadline visible on the detail screen. (An actual date/time-scheduling *model*
  now exists - see "Scheduled Booking & Worker Availability" below - but a dedicated
  calendar/schedule view of it is still deferred.)

## Customer home location

Not part of the original phase numbering in `PROJECT_BRIEF.md` - promoted to active build
directly from the business plan (customer-facing counterpart to worker availability below).
A customer can save multiple addresses (`addresses` table); the first one they ever save
becomes their default "Home Location" automatically, matching how a first-run Uber-style
signup step behaves.

- Signup's Home Location step (Phase 1, above) - sets the initial default.
- Settings -> Locations (Phase 1, above) - full CRUD, change which saved address is default.
- `AddressPicker` component - used at booking time by both the manual (Phase 2) and instant
  (Phase 3) request screens: choose the default Home Location, any other saved address, or
  type a fresh one-off address just for that booking (with an optional live-location capture,
  same permission-aware pattern as the worker's online toggle).

## Scheduled Booking & Worker Availability (business plan §13)

Not part of the original phase numbering in `PROJECT_BRIEF.md` - promoted to active build
directly from the business plan. Reuses the existing manual-booking flow rather than a
parallel system (see `DATA_MODEL.md`'s "Scheduled booking + worker availability").

- Worker: Availability screen (`/worker/availability`, linked from the Dashboard's online
  toggle) — weekly recurring availability blocks (day + start/end time, add/remove,
  replace-all save) and the optional self-reported "usually replies within Xh" field. Going
  online/offline is still the Dashboard's own manual toggle - it overrides the schedule
  until the next block boundary, it doesn't replace the toggle.
- Booking flow / request screen (Phase 2, extended above) — Now/"Schedule for later" toggle.
- Booking detail / tracking screen (Phase 2, extended) — shows the scheduled date/time and,
  while still awaiting a response, the "Respond by" deadline.
- Worker desktop lockout (2026-09-27) — worker screens stay mobile-only for the
  *operational* flow specifically, not the whole worker experience: going online (the
  Dashboard toggle), accepting/declining an instant request (`IncomingRequestPopup`) or a
  scheduled request, the active in-progress job screen, chat during a job, and marking a job
  complete are all actively intercepted on a desktop-width viewport (reusing `useIsDesktop`,
  the same hook/breakpoint `AdminShell.jsx` uses) with a message directing the worker to
  their mobile device, rather than silently failing or just omitting a desktop layout.
  `BookingDetail`/`BookingChat` block entirely (full-screen message) only while the
  booking's status is `requested`/`accepted`/`in_progress` - a completed/cancelled/declined
  booking is just history and stays fully desktop-usable. Earnings, Profile, Settings, the
  Availability schedule, and booking history are unaffected - only the operational actions
  above are blocked.

## Phase 6 — Admin (minimal, no theming)

- Admin dashboard (overview stats)
- Admin: Worker verification queue + detail/approve/reject
- Admin: Users list + detail (customers + workers), suspend/reinstate
- Admin: Bookings list + detail, moderation actions
- Admin: Categories/services management (the `services` table)
- Admin: Support tickets — single messenger-style master-detail screen (conversation list
  on the left, identified by the actual person's name; full chat panel on the right,
  reusing the same message-bubble/composer look as the in-app booking chat), not a
  data table + separate detail page
- Admin: Disputes list + detail
- Admin: Publications (renamed from Announcements, 2026-09-25) — one screen, one form, a
  Type dropdown (Notification / Promotion) at the top that drives everything else: which
  fields show (image/CTA only for Promotion) and where the published row appears. Publishing
  a Notification fans a real notification out to every matching customer/worker (see Phase 4
  above) and touches nothing on Home/Dashboard; publishing a Promotion renders only in the
  Home/Dashboard carousel and never touches notifications/Alerts. Designed to take a future
  publication type as an enum addition + routing rule, not a new screen
- Admin: Policies (simple static content management, not a builder) — unaffected by the
  Publications rework above; still its own screen/table (`content_items`, `kind='policy'`)

## Phase 6b — Admin RBAC + escalation (2026-09-27)

Built from a founder product discussion (Piece B of the "Desktop scope, Admin RBAC +
escalation, Customer responsive reflow, Fuel charge" round). Every admin/staff account is
either a **Super Admin** (bypasses all of this - sees and can act on everything) or holds zero
or more of four departments: `support`, `finance`, `operations`, `people_content`. Nav item
visibility is cosmetic only; every route is also gated server-side, so a menu a staffer can't
see is also a 403 if they call it directly.

- **Grouped nav**: Overview (the Dashboard route - everyone sees it, no group header; Analytics
  is now a tab on this same page rather than its own nav item, still Super-Admin-only even
  though its location moved) / Operations (Bookings, Live Ops - `operations`) / Support
  (Disputes, Support tickets, plus a read-only cross-access exception for Users - `support`) /
  Finance (Accounting - standalone, `finance`) / People & Content (Users, Approvals, Staff,
  Categories/Services, Publications, Policies - `people_content`) / Settings (standalone
  top-level link below the groups, Super Admin only, no group wrapper).
- **Admin: Staff** (`/admin/staff`, replaces the old `AdminComingSoon` stub) — Super-Admin-only.
  Create a new staff account (name/phone/email/password, Super Admin toggle, department
  checkboxes) and edit any existing staff account's department grants/Super-Admin flag. This
  is the only place department access is granted or revoked.
- **Read-only Users exception**: a Support-department staffer can view the Users list/detail
  (customers + workers) the same as People & Content can, but cannot suspend/reinstate an
  account or edit admin notes - those mutations stay People & Content-only. Enforced both in
  the UI (buttons/inputs hidden or disabled) and, for real, server-side.
- **Escalation**: Disputes and Support tickets each carry a `department` (defaults `support`)
  and can be manually escalated to a different department from their detail view - a select +
  button, no automatic/keyword routing. Escalating moves the item out of the old department's
  queue entirely and into the new one's, and appends a row to a visible escalation log (who,
  from → to, when) on that same detail view.
- **Color-coding**: every dispute/ticket row, in every list view (including the Support
  conversation list), shows a colored department badge reusing the existing `Badge.jsx`
  tones - no new visual language needed, the 4 departments map 1:1 onto its 4 existing tones.

## Later phases — not built until their phase starts

- Admin: full financial reporting (P&L, balance sheet, trial balance) — only once
  `commission_ledger` genuinely needs to grow into full accounting (see `DATA_MODEL.md`)
- Admin: expenses/vendors/cost centers
- Admin: deeper analytics dashboards, live-ops monitoring, feature-flag management
- Admin: audit log viewer
- Admin: automatic/keyword-based escalation routing (Phase 6b's escalation is manual-only by
  design; bargain/negotiation pricing is a separate, explicitly deferred backlog item - needs
  its own design pass, not spec'd)

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
