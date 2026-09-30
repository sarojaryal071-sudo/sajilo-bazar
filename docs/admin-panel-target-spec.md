# Sajilo Bazar — Admin Panel Target Spec
*Decided 2026-09-30. This is the agreed final shape for the admin panel — build toward this, not the current thin version and not the old repos' full scope.*

## Why this doc exists
The current `sajilo-bazar` admin panel is functionally real (not empty) but thin and fragmented — ~14 sidebar destinations, several of them one-purpose screens that could live together. An earlier, abandoned build (`sajilo-app` + `sajilo-backend`, referenced below) had a genuinely rich admin panel, but far too much of it — a full double-entry accounting system, fraud/anomaly detection, a visual theme-editor studio, deployment/simulation tooling. That's why the old repo felt unmanageable solo. This spec keeps what made it feel *useful* and drops what made it *unmanageable*.

## Reference repos (read-only source of ideas, not to be merged in directly)
- Current live app: `https://github.com/sarojaryal071-sudo/sajilo-bazar` (main) — this is what gets built on
- Old reference only, private now: `https://github.com/sarojaryal071-sudo/sajilo-app.git` (frontend), `https://github.com/sarojaryal071-sudo/sajilo-backend.git` (backend) — mine these for the specific features listed below, do not port their architecture (they used a config-driven screen-registry system; sajilo-bazar uses plain React routes — keep it that way) and do not touch their `.env` history or committed secrets (already rotated/deleted, repo is a dead reference only).

## Target structure — 8 sections, none thin

### 1. Dashboard
Replaces the current 4-stat-card version. Single rich screen, no separate Analytics page/tab.
- Stat cards: total/pending revenue, completed jobs, active workers, cancelled, total bookings (already exists — keep)
- Payment method distribution + payment status breakdown (cash vs. gateway, paid vs. pending)
- Top Earning Workers (ranked, with completed-job count)
- Top Rated Workers (ranked, with review count)
- Recent Low Ratings feed
- Cancellation stats, split by who cancelled (customer vs. worker)
- Flagged Workers: auto-flagged for high cancellation rate, low rating, or inactivity
- Top Performers: trust-based ranking (completion rate + rating + job volume)
- Reference: `sajilo-app/src/components/admin/AdminAnalyticsDashboard.jsx`, `sajilo-backend/src/modules/performance/workerIntelligence.service.js`

### 2. Users & Verification
Merge of current Users + Approvals (already planned) plus a Workers performance sub-tab.
- Existing: search/filter users, approve/reject verification documents, suspend/reinstate, notes
- New: a "Performance" tab on a worker's detail view showing their own earnings/rating/completion trend (same data source as Dashboard's ranked lists, just scoped to one worker)

### 3. Bookings
No change — already functional (list, detail, cancel/flag with reason).

### 4. Support
Merge of current Disputes + Support Tickets + a new Live Chat console.
- Existing: ticket queue, dispute queue, department-routed escalation
- New: real-time chat console (staff joins/replies to active customer/worker conversations directly via socket.io, filterable by category/status) — for "needs help right now," tickets stay for async issues
- Reference: `sajilo-app/src/screens/admin/AdminChat.jsx`

### 5. Finance (lean — explicitly not full accounting)
New section. Deliberately small scope:
- Revenue view: total revenue, commission, refunds, net income
- Expense list: vendor, category, amount, status (manual entry, no recurring-expense automation)
- **Explicitly excluded for now**: double-entry ledger (trial balance/balance sheet/cash flow/reconciliation), anomaly/risk/fraud detection, recurring-expense engine, expense auto-classification. Revisit only once there's real transaction volume and someone (a bookkeeper or you) actually reconciling books.
- Reference: `sajilo-backend/src/modules/financialReporting/platformRevenueService.js`, `src/modules/expenses/expenseService.js` — use as a model, not a lift-and-shift (the old versions are wired to the full ledger; this needs a simpler standalone version)

### 6. Catalog & Pricing
Merge of current Categories + the pricing parts of Settings (fuel base fee, fuel rate/km, service price bands, and — to add — commission rate, which is currently not exposed as an editable setting anywhere and needs to be).

### 7. Content
Merge of current Publications (notifications/promotions) + Policies (Terms/Privacy).

### 8. Staff & Access + Audit Log
Current Staff screen (RBAC, department grants) plus a new Audit Log tab.
- Audit Log: every sensitive action logged with severity (low/medium/high/critical), filterable by lens — Security (logins, password changes, role changes), Operations (staff actions, ticket/dispute lifecycle), Finance (payments, refunds, payouts) — with field-level before/after diffs
- Reference: `sajilo-app/src/screens/admin/AdminAudit.jsx`

## Also worth building (not a new section, a workflow fix)
**Worker password reset without OTP/SMS.** Current app has no real OTP/SMS (documented deferred item), so a locked-out worker has no self-service path. Build: worker requests reset → submits/reuses their verification documents (document viewer already exists) → admin confirms identity → issues temp password → worker forced to set a new one on next login (`must_change_password` flag pattern). Lives under Users & Verification, not its own section.

## Build order (phased, small increments — matches limited usage budget)
Work one phase at a time. Each phase should be small enough to land in a single session.

1. **Dashboard** — the ranked lists + flagged/top-performer sections + payment breakdown, added to the existing 4-stat dashboard. Backend: new queries for top earners/rated/flagged/top-performers (model on `workerIntelligence.service.js` logic, simplified).
2. **Staff & Access + Audit Log** — add the audit log table + logging calls on existing sensitive actions (suspend, approve/reject, role change, price change), then the filterable UI.
3. **Support: Live Chat console** — add real-time chat to the existing Support section.
4. **Catalog & Pricing merge** — fold Settings' pricing fields into Categories; add commission rate as an editable platform_setting.
5. **Content merge** — fold Policies into Publications as tabs.
6. **Finance (lean)** — new section: revenue view + manual expense list.
7. **Users & Verification: worker performance tab + document-based password reset workflow.**

## Instruction for the coding agent
> This is the agreed final destination for the admin panel — work through the Build Order phases one at a time, smallest complete slice per session. Do not build anything listed under "Explicitly excluded" without being asked again first. Do not port the old repos' config-driven architecture — keep plain React routes/components matching the current `sajilo-bazar` style. Start with Phase 1 (Dashboard).

## Progress

- [x] **1. Dashboard** — ranked lists (Top Earning/Rated Workers, Recent Low Ratings), Flagged Workers, Top Performers, payment method/status breakdown. New `GET /admin/dashboard/insights`, same access as `/dashboard/stats`. Judgment calls: Top Performers ranks directly on the existing persisted `trust_score` rather than a new formula; payment "status" (paid/pending) is derived from booking status since there's no dedicated column (cash is collected at completion, not a separate event); Flagged Workers thresholds (≥20% worker-cancellation rate, rating < 3.0, 30+ days inactive) are new and simplified, not ported from the old reference repo.
- [x] **2. Staff & Access + Audit Log** — `admin_audit_log` table (migration 050) + `auditLog` module (`apps/api/src/modules/auditLog/`) + `GET /admin/audit-log` (Super Admin only) + an "Audit Log" tab on the existing Staff screen (`/admin/staff`, not a new nav item). Logging calls added to: worker suspend/reinstate, verification document approve/reject, cross-category worker-service approve/reject, staff create/access update, dispute resolve/escalate, service (category/name/description) update, platform setting update, and admin/staff login success/failure + password reset.
  - **Severity mapping** (own judgment, spec only fixed the four buckets): staff create/access update and password reset = `high` (grants/changes who can act as staff, or changes a credential); platform setting update = `high` (pricing/commission config with platform-wide, revenue-shaped blast radius, even though it isn't a role/staff/security change); user suspend, document/service approve-reject, dispute resolve = `medium`; user reinstate, dispute escalate, login success = `low`; login failure = `medium`.
  - **Lens mapping**: Security = auth.* + staff.created + staff.access_updated (creating a staff account is itself an access grant, not just day-to-day moderation). Operations = user suspend/reinstate, verification/worker-service decisions, dispute resolve/escalate, service update. Finance = platform_setting.updated — the spec's Finance lens description ("payments, refunds, payouts") doesn't exist yet as an action (that's Phase 6), but fuel fee/rate and service price bands are pricing config, so they're filed there now rather than under Operations.
  - **Scope judgment call**: login/password-reset logging is scoped to admin/staff accounts only, not every customer/worker login. `auth.service.js`'s login and forgot-password endpoints are shared across all roles (and forgot-password has no OTP gate at all — anyone can reset any phone's password), so logging every attempt would flood a log meant to be "Staff & Access"-scoped and would stop being a browsable record. A login attempt against a phone number that doesn't resolve to any account isn't logged at all (nothing to attribute it to).
  - No staff/admin "price change" column exists on `services` — the admin Categories screen's price editing lives entirely in the `service_price_bands` platform_setting, already covered by the platform_setting.updated logging above. `service.updated` logs category/name/description edits instead.
  - Verified: syntax/lint/build clean; live check via curl — one failed admin login, one successful one, a worker suspend then reinstate — confirmed correct severities, before/after diffs, lens filtering (`?lens=security` returned exactly the two login entries), Super Admin-only access (403 for a non-admin token, 401 unauthenticated), and that a non-admin (worker) login produced no audit row. Test worker's moderation status was restored to `active` afterward.
- [x] **3. Support: Live Chat console** — a new "Live Chat" tab on the existing `/admin/support` screen (Tickets tab unchanged), not a new nav item. Disputes stays its own separate screen — this phase only adds Live Chat next to Tickets, it doesn't do the spec's full Disputes+Tickets+LiveChat merge.
  - **Data-model judgment call (the significant one)**: this is a real-time layer over the existing `support_tickets`/`support_ticket_messages` tables, not a new chat data model. There's no existing customer/worker-facing "start a live chat" entry point anywhere in the app — the only self-service support path is `HelpSupport.jsx`'s one-shot ticket form, and a customer/worker has no way to see admin's replies or send a follow-up message in-app at all today (they only get a push notification). Building genuine two-way live chat would mean adding that missing user-facing thread/reply UI, which is well beyond "a new tab alongside the existing Support Tickets screen" and wasn't asked for. So "conversation" = a support ticket; "live" = push delivery (via new `support-chat:*` socket rooms) on top of the same HTTP-persisted messages, mirroring booking chat's own "sockets carry presence/push, content travels over HTTP" split (`chat.socket.js`). Ready to receive genuine two-way live messages the moment a user-side reply capability exists, but doesn't build that capability itself.
  - Filters: category = the ticket opener's `role` (customer/worker, newly joined into the ticket queries); status = open ("unassigned") vs. in_progress ("being handled") — the list itself is always restricted server-side to those two (`listActiveSupportTickets`), resolved/closed tickets never appear here regardless of filter.
  - Escalation: reuses the existing `escalateTicket` action as-is (no new escalation path) — same as the instruction asked.
  - Real-time plumbing: new `emitToRoom()` (generalizes the existing user-only `emitToUser()`), a new `supportChat.socket.js` module with an admin-list room (list-level live updates: new ticket, status change) and a per-ticket room (live message push while a thread is open), wired from `replyToTicket`/`setTicketStatus`/the user-facing `createSupportTicket`. Auto-opened tickets (the existing 3-strikes/cancellation-rate/dispute escalation support tickets, created by `adminModel.createSupportTicket` directly rather than through the user-facing service function) still show up in the list on next load/query but don't trigger the instant live push — a small, deliberate scope trim given this phase's time budget, not a correctness gap.
  - Verified: syntax/lint/build clean only, per this round's explicit instruction to keep verification light and favor finishing the phase — no live multi-client socket test was run.
- [x] **4. Catalog & Pricing merge** — fuel base fee, fuel rate/km, and commission rate now live on Admin -> Categories (renamed "Catalog & Pricing", nav label updated too) under a new "Platform pricing" card, alongside the per-service price bands that were already there. Settings keeps `get_quotes_window_minutes`/`get_quotes_cap` (unrelated to pricing, so it stays a real screen, not an empty redirect).
  - **The significant find**: `commission_rate` was never a platform_setting at all - it was a hardcoded JS constant (`COMMISSION_RATE = 0.15` in `commissionLedger.service.js`), used directly in `recordCompletion()` on every booking completion, plus a second copy of the same number in `backfillCommissionLedger.js`'s fallback logic. Migrated both call sites to read the new `commission_rate` platform_setting (`platformSettings.service.js`'s new `getCommissionRate()`, same "read fresh every call, no redeploy" pattern as `getFuelPricing()`) instead of the constant, which is now deleted - one source of truth, not two. New migration 051 seeds the row at the same 0.15 the constant held, so this changes nothing about what a booking completing today actually charges.
  - **Validation judgment call**: `commission_rate` is a fraction (0.15 = 15%), not a percentage, but the existing generic `value: nonnegative number` schema every platform_setting's PATCH goes through would otherwise let an admin type `15` (1500%) straight into every future commission calculation. Added a targeted 0-1 bounds check in `platformSettings.service.js`'s `updateSetting()` (not a schema-wide change) rather than building percent-display conversion in the UI - the input is a plain decimal with help text saying so ("e.g. 0.15 for 15%"), which is less polished than a %-based input but was the right size for this phase's budget. Flagging in case a nicer input is wanted later.
  - `service_price_bands` was already on Categories before this phase (a Phase 2-era decision, not new) - confirmed, not re-built.
  - Extracted the generic numeric-setting editor from `AdminSettings.jsx` into a shared `components/SettingEditor.jsx` (plus a shared `lib/platformSettingsLabels.js` for the label/help strings) so Categories and Settings don't duplicate it - the only structural change beyond moving where fields render.
  - Audit logging: confirmed via a live check, not new code - `commission_rate` changes go through the same `updatePlatformSetting` → `platform_setting.updated` (`high` severity, Finance lens) path Phase 2 already built, with no changes needed there.
  - Verified: syntax/lint/build clean, plus one live check (worth doing given this touches real commission math) - ran migration 051, confirmed `commission_rate` appears in `GET /admin/settings` at 0.15, a `PATCH` with value `15` is rejected `400`, a valid `PATCH` to `0.2` succeeds and the existing audit log shows both changes correctly under the Finance lens with old/new diffs. Value restored to 0.15 afterward. Did not run a full booking-completion flow to see the new rate applied end-to-end (the rate-lookup code path itself - `getCommissionRate()` - mirrors `getFuelPricing()` exactly, already proven in production use).
- [x] **5. Content merge** — Publications (notifications/promotions) and Policies (Terms/Privacy/Community Guidelines) now live on one screen as tabs, replacing two separate nav items. Pure UI/navigation merge - neither screen's data model, editing logic, or API calls changed at all, only where they're rendered from.
  - `AdminPublications.jsx` and `AdminPolicies.jsx` merged into one new `AdminContent.jsx` (Publications tab + Policies tab, same tab-bar pattern as Phase 2's Staff/Audit Log and Phase 3's Tickets/Live Chat) - the two old files deleted rather than left as dead code.
  - **Nav judgment call**: renamed the surviving nav entry to "Content" (your call to make, per the instruction) rather than keeping "Publications" - "Content" is also literally the target spec's own name for this merged section, so it seemed the more honest label once Policies lives there too. Kept the existing `/admin/publications` route/URL rather than renaming it to `/admin/content` - same restraint as Phase 4 keeping `/admin/categories` after renaming that screen to "Catalog & Pricing": renaming user-facing labels is low-risk, renaming URLs has no real benefit here and only adds churn.
  - **Shared extraction**: `AdminPublications.jsx` and `AdminPolicies.jsx` each had their own identical `STATUS_TONE` map and the exact same status-badge-plus-"Live now"-badge pair rendered next to it - extracted into a new `components/PublicationStatusBadges.jsx` (same spirit as Phase 4's `SettingEditor` extraction: a genuine, already-identical duplication, not a forced one). Did not attempt to merge the two tabs' actual editors (list+create+form vs. fixed-three-records edit-in-place) - they're structurally too different to share meaningfully, and the instruction was explicit that only a "clean, low-risk" extraction was wanted.
  - Verified: syntax/lint/build clean only, per the instruction that this phase (no money math, no real-time/socket code) almost certainly doesn't need a live check - agreed with that judgment, none was run. Confirmed no dangling references to the two deleted files remain anywhere in the frontend.
- [ ] 6. Finance (lean)
- [ ] 7. Users & Verification: worker performance tab + password reset workflow
