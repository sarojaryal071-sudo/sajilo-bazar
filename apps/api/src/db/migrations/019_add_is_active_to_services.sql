-- Admin panel Round B: lets an admin deactivate a catalog service without
-- deleting it (services.id is ON DELETE RESTRICT from worker_services and
-- booking_services, so a hard delete is never possible once a service has
-- been offered or booked).
ALTER TABLE services ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
