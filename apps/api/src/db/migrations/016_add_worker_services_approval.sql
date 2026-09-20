-- Controlled expansion: a worker can add more services from the existing
-- catalog beyond what they registered with at signup, but never free-text.
-- Mirrors verification_documents' approve/reject pattern (status lives on
-- the row itself, reviewed_by/reviewed_at for the admin queue in Phase 6).
--
-- Existing rows default to 'approved' - they were already vetted through
-- the worker-apply verification flow, so backfilling them as pending would
-- incorrectly hide services workers are already booked for.
--
-- Same-category additions go live immediately (approved); a different
-- category needs admin review before it's bookable, since it's outside
-- what was verified at signup.

ALTER TABLE worker_services
  ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ;

CREATE INDEX idx_worker_services_approval_status ON worker_services(approval_status)
  WHERE approval_status = 'pending';
