-- Remove Products, Machines, and Vendors domain data/tables.
-- This keeps the system focused on Dashboard + Customers flow.

BEGIN;

-- Clear dependent transactional values that reference removed domains.
UPDATE invoice_items
SET product_id = NULL
WHERE product_id IS NOT NULL;

-- Drop related tables (safe to run multiple times).
DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS rental_machine_counts CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS general_machines CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

COMMIT;
