-- Payment method chosen by the worker at job completion (business plan §6).
-- Cash is the only functional option right now; eSewa is a UI seam only
-- (see CompleteBookingInputSchema, which still rejects anything but 'cash'
-- server-side). Defaults to 'cash' for existing rows and every booking
-- until it's actually completed.
ALTER TABLE bookings ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('cash', 'esewa'));
