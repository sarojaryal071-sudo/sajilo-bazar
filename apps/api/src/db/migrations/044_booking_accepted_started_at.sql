-- Booking Detail timeline (Requested -> Accepted -> Job Started -> Completed)
-- needs a timestamp for each step it already has data for - created_at and
-- completed_at exist, but the accepted/in_progress transitions weren't
-- recorded. Purely additive and display-only: nothing here changes when or
-- how a booking transitions status, only records when a transition that
-- already happens actually happened.
ALTER TABLE bookings ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN started_at TIMESTAMPTZ;
