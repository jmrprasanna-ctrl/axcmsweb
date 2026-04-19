-- AXIS CMS dev-only full reset script
-- WARNING: Destructive. This deletes core tables and data.
-- Use only for intentional local/dev rebuilds.

DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS general_machines CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS conditions CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS category_model_options CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
