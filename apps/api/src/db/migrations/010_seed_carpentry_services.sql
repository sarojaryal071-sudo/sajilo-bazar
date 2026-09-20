-- Adds a fourth service category to the starter catalog from 006, so the
-- app isn't limited to plumbing/electrical/cleaning. Guarded by NOT EXISTS
-- (services has no unique constraint on category/name) so this stays safe
-- to apply even if run more than once.

INSERT INTO services (category, name, description)
SELECT * FROM (VALUES
  ('carpentry', 'Furniture assembly', 'Assemble flat-pack and custom furniture'),
  ('carpentry', 'Door and window repair', 'Fix sticking doors, windows, and hinges'),
  ('carpentry', 'Custom shelving', 'Build and install shelves and storage units')
) AS new_services(category, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.category = new_services.category
);
