-- Settings -> Notifications matrix. One row per (user, category) - absence
-- of a row means "on" (the default), so most users never get a row at all;
-- toggling a cell off is the only thing that writes one. Only the in_app
-- column is real in this v1 - the SMS/Email/WhatsApp columns shown in the
-- matrix are a visual "Coming soon" seam with nothing to persist yet.

CREATE TABLE notification_preferences (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
