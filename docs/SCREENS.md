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
  now pure navigation), Support (contact support, Terms & Conditions, Privacy Policy)
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
- Worker detail screen — profile, services, price, ratings, "Book" action, trust badge,
  and "usually replies within Xh" when the worker has set one (see business plan §13
  section below)
- Booking flow / request screen — Now/"Schedule for later" mode toggle at the top
  (business plan §13); schedule mode adds a date/time picker and a 1/6/24h
  response-deadline preset picker, both required together. Available directly from any
  worker's profile, the same entry point as an urgent booking - not gated to
  unmatched/broadcast-fallback workers
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

- Instant request creation screen (service, description, location)
- Live "waiting for worker" state (customer side)
- Live incoming-request popup/notification (worker side) — accept/decline under time
  pressure
- Booking tracking screen extended with live status for the instant flow

## Phase 4 — Notifications

- Notification inbox/list screen — a published admin announcement (see Phase 6 below) fans
  out as a real notification to every matching customer/worker, not just the Home/Dashboard
  promo banner; tapping one opens the full text in a modal rather than the generic
  booking-navigate fallback
- Notification bell/badge component (not a full screen — see `DESIGN_SYSTEM.md`)
- Promo banner (Home and worker Dashboard, not a full screen) — the single latest live
  announcement for that viewer's role, tap to read the full text, dismiss for the session

## Phase 5 — Commission Ledger (worker-facing)

- Worker: Dashboard earnings card — compact snapshot (7-day sparkline, this week's total,
  jobs-completed count) sitting alongside the existing today's-jobs/quick-stats content;
  tapping it navigates to the full Earnings screen
- Worker: Earnings screen (summary row: total lifetime earnings, this month, commission
  owed, credit balance; full range chart - 7D/30D/All; paginated transaction history with
  customer, amount, commission, and running balance per job) — reached via the Dashboard
  card, not a bottom-nav tab
- Worker: Schedule — still folded into Jobs, not a separate "calendar" screen; a scheduled
  booking shows up in the same Jobs list as any other, with its scheduled date/time and
  response deadline visible on the detail screen. (An actual date/time-scheduling *model*
  now exists - see "Scheduled Booking & Worker Availability" below - but a dedicated
  calendar/schedule view of it is still deferred.)

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
- Admin: Announcements (simple — platform-wide notices) — publishing one fans a real
  notification out to every matching customer/worker (see Phase 4 above), not just the
  promo banner
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
