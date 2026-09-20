-- Starter service catalog so the app has something to browse/search out of
-- the box. Real catalog management is admin's job (Phase 6) - this just
-- unblocks Home/Search until that exists. Matches the "plumbers,
-- electricians, cleaners" examples from PROJECT_BRIEF.md.

INSERT INTO services (category, name, description) VALUES
  ('plumbing', 'Pipe leak repair', 'Fix leaking pipes and joints'),
  ('plumbing', 'Tap and faucet installation', 'Install or replace taps and faucets'),
  ('plumbing', 'Drain unclogging', 'Clear blocked drains and pipes'),
  ('electrical', 'Wiring inspection', 'Inspect and repair household wiring'),
  ('electrical', 'Switch and socket repair', 'Fix faulty switches and power sockets'),
  ('electrical', 'Fan and light installation', 'Install ceiling fans and light fixtures'),
  ('cleaning', 'Deep home cleaning', 'Full house deep clean'),
  ('cleaning', 'Bathroom cleaning', 'Deep clean and sanitize bathrooms'),
  ('cleaning', 'Kitchen cleaning', 'Deep clean kitchen surfaces and appliances');
