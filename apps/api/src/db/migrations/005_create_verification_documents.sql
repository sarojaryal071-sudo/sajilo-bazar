-- One row per document a worker uploads for identity/skill verification.
-- Status lives on the document itself - no separate review table.

CREATE TABLE verification_documents (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  doc_type VARCHAR(40) NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_documents_worker ON verification_documents(worker_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status) WHERE status = 'pending';
