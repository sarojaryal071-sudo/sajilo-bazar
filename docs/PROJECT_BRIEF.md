# Sajilo Bazar — Build Brief for the Implementation Session

**Read this file first, then `DATA_MODEL.md`, `SCREENS.md`, and `DESIGN_SYSTEM.md` before writing any code.**

## What this is

Sajilo Bazar is a local services marketplace for Nepal: skilled, often unemployed youth
(plumbers, electricians, cleaners, etc.) register as workers; customers book them either
directly or by posting an instant request that broadcasts to nearby online workers
(first to accept gets the job). Full business context lives in the project's
`sajilo-sewa-business-plan.md` doc if you need it, but this brief plus the other docs in
this folder are the working spec — build from these.

## Ground rules (read carefully — this is why we're rebuilding)

The previous codebase (`sajilo-app` / `sajilo-backend`, referenced for feature parity only)
became unmanageable: ~45 database tables, a custom UI-theming/token "engine," and dozens of
"registry" abstraction layers wrapping things that could have been plain functions or a
single config object. **Do not repeat that pattern.** Specifically:

- **No custom abstraction layers.** No "registry," "engine," "orchestrator," or "resolver"
  modules unless a feature genuinely needs one (real-time booking matching does; almost
  nothing else does). If you're tempted to build a generic system to configure a feature,
  stop and just build the feature.
- **One shape per backend module, no exceptions**: `routes.js` → `controller.js` →
  `service.js` → `model.js` (raw SQL lives here). Every feature — auth, bookings, chat,
  whatever — follows this exact shape. Same file layout every time makes the codebase
  predictable instead of bespoke per-feature.
- **Keep files short.** If a file is pushing past ~200–300 lines, it's doing too much —
  split by responsibility, not by adding a new abstraction layer on top.
- **Plain JavaScript, not TypeScript.** Raw SQL, not an ORM. These are deliberate choices —
  don't introduce TypeScript, Prisma, or similar mid-build.
- **No admin UI-editing/theming studio.** This is the one feature dropped outright from the
  old app (see `SCREENS.md` — `AdminUIControl/*` is excluded). Everything else from the old
  app's feature set is in scope, just phased (see Build Order below) and rebuilt cleanly.
- **Ask before assuming** when a screen or flow in the old repo is ambiguous — don't guess
  and build silently. Flag it back to this planning session.

## Tech stack

- **Frontend**: React + Vite, mobile-first, deployed as an installable PWA
- **Backend**: Node.js + Express, plain JavaScript
- **Database**: PostgreSQL, raw SQL (`pg` library), no ORM
- **Real-time**: socket.io (worker online status, instant-request broadcast, chat, live
  booking status)
- **File storage**: Cloudinary (verification docs, profile photos)
- **Auth**: JWT sessions
- **Validation / shared contract**: Zod schemas in `packages/shared/schemas/` — the single
  source of truth for what a Booking, User, Worker Profile, etc. look like. Backend
  validates against these; frontend mocks are generated from these before a real endpoint
  exists.

## Repo structure

```
sajilo-bazar/
  apps/
    web/                 React frontend — customer, worker, and admin UI
      src/
        screens/         one folder per screen group (see SCREENS.md)
        components/       shared UI components (see DESIGN_SYSTEM.md)
        api/              API client functions — swap mock → real per module
        mocks/            mock data generated from packages/shared schemas
    api/                  Node/Express backend
      src/
        modules/
          auth/
            auth.routes.js
            auth.controller.js
            auth.service.js
            auth.model.js
          bookings/        (same shape)
          workers/         (same shape)
          ...one folder per module, same four files, every time
        db/
          migrations/      one .sql file per table, numbered
        middleware/
        app.js
        server.js
  packages/
    shared/
      schemas/            Zod schema per entity (booking.schema.js, user.schema.js, ...)
  docs/                    this folder — planning docs, not app code
```

## Build order (do not build everything at once)

Work through modules in this order. For each module: write the shared Zod schema → build
the frontend screen(s) against mock data generated from it → confirm the UI looks right →
build the real backend module → swap mock data for the real API call.

Phase 1 — Auth & Profiles
- Backend: auth, users, workers modules; tables users, worker_profiles, services, worker_services, verification_documents
- Frontend: Welcome, Login, Signup (role selection), Profile, Worker Apply, Worker Pending/status
- Done when: a customer and a worker can each sign up, log in, and a worker can submit services + verification documents that land in the database

Phase 2 — Manual Booking
- Backend: bookings module (manual type only), chat module, reviews module
- Tables: bookings, chat_messages, reviews
- Frontend: Home (with inline search - see SCREENS.md), Worker Detail, Booking request flow, Bookings list, Booking detail/tracking, Chat, Review modal, Worker Jobs screen, Worker Dashboard
- Done when: a customer can find a worker, book them directly, chat, the worker can accept/decline and mark complete, and the customer can leave a review

Phase 3 — Instant Request
- Backend: extend bookings for instant type, add booking_offers table + broadcast logic, socket.io wiring for online status and fan-out
- Frontend: Instant request creation screen, live "waiting for worker" state, worker's live incoming-request popup with accept/decline
- Done when: posting an instant request notifies all matching online workers in real time, and the first to accept is reliably the only one assigned

Phase 4 — Notifications
- Backend: notifications module, tied into events from Phases 2-3
- Frontend: Notification inbox screen, notification bell/badge component
- Done when: every booking/chat event a user should know about produces a real notification

Phase 5 — Commission Ledger
- Backend: commission_ledger module and table, worker credit-balance logic
- Frontend: Worker Earnings screen
- Done when: completing a booking creates a ledger entry and updates the worker's balance correctly

Phase 6 — Admin (minimal, no theming)
- Backend: admin module - verification review, user/booking moderation, services/categories management
- Frontend: Admin dashboard, verification queue, users list/detail, bookings list/detail, categories management
- Done when: the platform can be run day-to-day from the admin panel

Phase 7 — Trust & Support
- Backend + tables: support_tickets, disputes
- Frontend: Support ticket screens, Dispute detail
- Done when: a bad booking has a real resolution path

Phase 8 — Payments maturity
- eSewa/Khalti in-app payment integration, automated commission deduction
- Done when: commission collection no longer depends on worker self-reporting

Phase 9 — Full accounting & scale
- Full double-entry accounting (only if commission_ledger isn't enough), staff roles/permissions, deeper analytics, geographic/category expansion

## What to report back to the planning session

After each module: a short summary of what was built, any deviation from these docs and
why, and anything ambiguous you had to make a judgment call on. Don't silently make product
decisions — flag them.
