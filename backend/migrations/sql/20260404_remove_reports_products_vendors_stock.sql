-- Remove Products/Vendors/Stock domain tables and clean related access entries.
-- Keeps Finance endpoints operational while removing deprecated inventory modules.

BEGIN;

-- Drop FK dependencies first.
ALTER TABLE IF EXISTS invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;

ALTER TABLE IF EXISTS products
  DROP CONSTRAINT IF EXISTS products_vendor_id_fkey;

ALTER TABLE IF EXISTS rental_machine_consumables
  DROP CONSTRAINT IF EXISTS rental_machine_consumables_product_id_fkey;

ALTER TABLE IF EXISTS stocks
  DROP CONSTRAINT IF EXISTS stocks_product_id_fkey;

-- Drop removed module tables.
DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS rental_machine_counts CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS general_machines CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Cleanup old access page/action entries.
UPDATE user_accesses
SET allowed_pages_json =
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(COALESCE(allowed_pages_json, '[]'), '"/reports/sales-report.html",', ''),
        ',"/reports/sales-report.html"', ''
      ),
      '"/reports/sales-report.html"', ''
    ),
    '"/products/product-list.html"', ''
  );

UPDATE user_accesses
SET allowed_actions_json = REPLACE(COALESCE(allowed_actions_json, '[]'), '"/reports/sales-report.html::view"', '');

COMMIT;
