# Admin Panel Build Plan

Admin panel is desktop-only (gated below 1024px — see existing implementation).
Already built: app shell, access control, Dashboard, Approvals (verification docs +
cross-category worker-service requests).

## Working rules for every round
- Build only that round's scope — don't get ahead of the plan.
- Lightweight verification only: code review + minimal direct check (a SQL query, a
  curl call, or a single screenshot pass). No automated Playwright/multi-browser test
  suites unless something is genuinely unverifiable any other way.
- Commit and push directly to `main`.
- Report back concisely — bullet points, not long prose — and flag judgment calls.

## Round A — Users + Bookings
**Users**: list (name, phone, role, status, joined date), filterable by role/status,
searchable by name/phone. Detail: full profile, worker-specific info if applicable
(services, rating, verification status), booking history, suspend/reinstate action,
internal admin notes field.
**Bookings**: list (customer, worker, service(s), status, price, date, type),
filterable by status/date/type. Detail: full status timeline, linked chat transcript,
commission entry, moderation actions (cancel, flag).
Build together — Bookings reference Users directly, and both share the same
list/detail/filter UI pattern.

## Round B — Categories/Services
List of categories and their services, add/edit/deactivate a service. Consider
whether the cross-category worker-service approval queue (currently in Approvals)
should also surface here for context — your call, note the decision.

## Round C — Disputes + Support tickets
Same underlying pattern for both: a case/ticket list → detail → thread/notes →
resolve. Build the shared pattern once, apply to both.
**Disputes**: list (booking, parties, status, date opened). Detail: reason/notes,
linked booking + chat transcript, resolution actions.
**Support tickets**: list (user, subject, status, priority). Detail: message thread,
respond, change status, link to related booking if relevant.

## Round D — Announcements + Policies
Both simple content-management screens (list, create/edit, publish) — build one
shared component, apply to both content types.
**Announcements**: title, body, audience (all/customers/workers), schedule/expire,
publish/unpublish.
**Policies**: Terms of Service, Privacy Policy, Community Guidelines — simple content
editor, publish.

## Round E — Staff
List of staff/admin accounts with a basic role tag (admin, support, moderator,
finance — no full permissions matrix). Invite/create new staff, deactivate access.

## Round F — Accounting (basic, not double-entry)
Platform-wide view into `commission_ledger` — total commission earned, filterable by
date range and worker, with per-worker drill-down (same shape as a worker's own
earnings screen, platform-wide). Best done after Round A since it's a specialized
view over booking/commission data.

## Round G — Settings
Small set of real config values: commission rate %, instant-request search radius,
maintenance-mode toggle. Not a sprawling settings hub.

## Round H — Analytics + Live Ops
Both are monitoring/dashboard patterns — share visual structure.
**Analytics**: charts for bookings over time, revenue over time, new signups over
time, category breakdown.
**Live Ops**: real-time count of online workers, active in-progress bookings,
pending/unmatched instant requests — reuse the existing socket connection.
