-- High-risk flag on services, not a separate categories table -
-- services.category is already the only source of truth for category
-- grouping everywhere else in this codebase (see admin.service.js
-- getCategoriesOverview), so this stays consistent with that rather than
-- forking it. Admin-editable from the existing Categories/Services screen.
-- Drives whether a worker adding this service from outside their verified
-- category(ies) must submit a supporting document before it enters the
-- pending-review queue (see workers.service.js addService).
--
-- Default seeding: only 'electrical' is flagged true - the catalog's
-- plumbing services (pipe leak repair, tap/faucet installation, drain
-- unclogging) aren't gas-related, so blanket-flagging all of plumbing
-- would misrepresent the actual work. This is just a starting point -
-- admin can flip it per service at any time.
ALTER TABLE services ADD COLUMN high_risk BOOLEAN NOT NULL DEFAULT false;
UPDATE services SET high_risk = true WHERE category = 'electrical';

-- Same rejection-reason pattern verification_documents already has
-- (migration 022) - the admin's reason for rejecting a cross-category
-- service request, shown back to the worker so they can retry.
ALTER TABLE worker_services ADD COLUMN review_comment TEXT;

-- Links a supporting document to the specific cross-category service
-- request it was submitted for, when the category is high-risk. Nullable -
-- every other verification_documents row (the original worker-apply
-- documents) is untouched. Documents tied to a service request are
-- surfaced alongside that request in the Approvals queue rather than as a
-- separate identity-verification item - see admin.model.js
-- listPendingDocuments/listPendingServices.
ALTER TABLE verification_documents ADD COLUMN worker_service_id INTEGER REFERENCES worker_services(id) ON DELETE CASCADE;
CREATE INDEX idx_verification_documents_worker_service ON verification_documents(worker_service_id)
  WHERE worker_service_id IS NOT NULL;
