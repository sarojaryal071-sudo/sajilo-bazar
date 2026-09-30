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
