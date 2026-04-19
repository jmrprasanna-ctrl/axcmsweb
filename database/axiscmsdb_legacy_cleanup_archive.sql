-- AXIS CMS legacy SQL archive
-- Created: 2026-04-20
-- Purpose: keep removed legacy/unused SQL blocks for reference/rollback.
-- NOTE: This file is not executed by migration runner.

-- ===== Migration: 20260404_remove_legacy_catalog_tables.sql =====
BEGIN;

DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS general_machines CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS category_model_options CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS conditions CASCADE;

COMMIT;

-- ===== Migration: 20260404_remove_reports_products_vendors_stock.sql =====
BEGIN;

ALTER TABLE IF EXISTS invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;

ALTER TABLE IF EXISTS products
  DROP CONSTRAINT IF EXISTS products_vendor_id_fkey;

ALTER TABLE IF EXISTS rental_machine_consumables
  DROP CONSTRAINT IF EXISTS rental_machine_consumables_product_id_fkey;

ALTER TABLE IF EXISTS stocks
  DROP CONSTRAINT IF EXISTS stocks_product_id_fkey;

DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS rental_machine_counts CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS general_machines CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

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

-- ===== Migration: 20260407_add_profile_view_access_path.sql (legacy user_access part) =====
DO $$
BEGIN
  IF to_regclass('public.user_access') IS NOT NULL THEN
    WITH src AS (
      SELECT
        id,
        COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
      FROM user_access
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/users/user-list.html%'
         OR COALESCE(allowed_pages_json, '') LIKE '%/users/profile-list.html%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(pages) AS value
            UNION ALL SELECT '/users/profile-view.html'
          ) x
        ) AS pages_new
      FROM src
    )
    UPDATE user_access ua
    SET allowed_pages_json = expanded.pages_new::text
    FROM expanded
    WHERE ua.id = expanded.id;

    WITH src AS (
      SELECT
        id,
        COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
      FROM user_access
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/users/user-list.html::view%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/profile-list.html::view%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(actions) AS value
            UNION ALL SELECT '/users/profile-view.html::view'
          ) x
        ) AS actions_new
      FROM src
    )
    UPDATE user_access ua
    SET allowed_actions_json = expanded.actions_new::text
    FROM expanded
    WHERE ua.id = expanded.id;
  END IF;
END $$;

-- ===== Migration: 20260407_map_support_permissions_to_lawyer_court_lists.sql =====
WITH src AS (
  SELECT
    id,
    COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
  FROM user_access
  WHERE COALESCE(allowed_pages_json, '') LIKE '%/support/support.html%'
),
expanded AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
      FROM (
        SELECT jsonb_array_elements_text(pages) AS value
        UNION ALL SELECT '/support/lawyer-list.html'
        UNION ALL SELECT '/support/court-list.html'
      ) x
    ) AS pages_new
  FROM src
)
UPDATE user_access ua
SET allowed_pages_json = expanded.pages_new::text
FROM expanded
WHERE ua.id = expanded.id;

WITH src AS (
  SELECT
    id,
    COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
  FROM user_access
  WHERE COALESCE(allowed_actions_json, '') LIKE '%/support/support.html::%'
),
expanded AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
      FROM (
        SELECT jsonb_array_elements_text(actions) AS value
        UNION ALL SELECT '/support/lawyer-list.html::view'
        UNION ALL SELECT '/support/lawyer-list.html::add'
        UNION ALL SELECT '/support/lawyer-list.html::edit'
        UNION ALL SELECT '/support/lawyer-list.html::delete'
        UNION ALL SELECT '/support/court-list.html::view'
        UNION ALL SELECT '/support/court-list.html::add'
        UNION ALL SELECT '/support/court-list.html::edit'
        UNION ALL SELECT '/support/court-list.html::delete'
      ) x
    ) AS actions_new
  FROM src
)
UPDATE user_access ua
SET allowed_actions_json = expanded.actions_new::text
FROM expanded
WHERE ua.id = expanded.id;

-- ===== Migration: 20260408_add_company_edit_access.sql (legacy user_access part) =====
DO $$
BEGIN
  IF to_regclass('public.user_access') IS NOT NULL THEN
    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
      FROM user_access
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/users/company-create.html%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(pages) AS value
            UNION ALL SELECT '/users/company-edit.html'
          ) x
        ) AS pages_new
      FROM src
    )
    UPDATE user_access ua
    SET allowed_pages_json = expanded.pages_new::text
    FROM expanded
    WHERE ua.id = expanded.id;

    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
      FROM user_access
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::add%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::view%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::delete%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(actions) AS value
            UNION ALL SELECT '/users/company-create.html::edit'
            UNION ALL SELECT '/users/company-edit.html::view'
            UNION ALL SELECT '/users/company-edit.html::edit'
          ) x
        ) AS actions_new
      FROM src
    )
    UPDATE user_access ua
    SET allowed_actions_json = expanded.actions_new::text
    FROM expanded
    WHERE ua.id = expanded.id;
  END IF;
END $$;

-- ===== Migration: 20260409_map_legacy_tools_access_to_backup_page.sql =====
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['user_accesses', 'user_access']
  LOOP
    IF to_regclass(format('public.%s', target_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format($q$
      UPDATE %I
      SET allowed_pages_json =
        REPLACE(
          REPLACE(
            REPLACE(COALESCE(allowed_pages_json, '[]'),
              '"/tools/check-backup.html"',
              '"/users/backup.html"'
            ),
            '"/tools/backup-download.html"',
            '"/users/backup.html"'
          ),
          '"/tools/upload-db.html"',
          '"/users/backup.html"'
        )
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/tools/%';
    $q$, target_table);

    EXECUTE format($q$
      UPDATE %I
      SET allowed_actions_json =
        REPLACE(
          REPLACE(
            REPLACE(COALESCE(allowed_actions_json, '[]'),
              '/tools/check-backup.html::',
              '/users/backup.html::'
            ),
            '/tools/backup-download.html::',
            '/users/backup.html::'
          ),
          '/tools/upload-db.html::',
          '/users/backup.html::'
        )
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/tools/%';
    $q$, target_table);
  END LOOP;
END $$;

-- ===== Migration: 20260409_map_removed_payments_list_to_create_invoice.sql =====
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['user_accesses', 'user_access']
  LOOP
    IF to_regclass(format('public.%s', target_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format($q$
      UPDATE %I
      SET allowed_pages_json =
        REPLACE(
          REPLACE(COALESCE(allowed_pages_json, '[]'),
            '"/invoices/Payments-list.html"',
            '"/invoices/create-invoice.html"'
          ),
          '"/invoices/invoice-list.html"',
          '"/invoices/create-invoice.html"'
        )
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/invoices/%list.html%';
    $q$, target_table);

    EXECUTE format($q$
      UPDATE %I
      SET allowed_actions_json =
        REPLACE(
          REPLACE(COALESCE(allowed_actions_json, '[]'),
            '/invoices/Payments-list.html::',
            '/invoices/create-invoice.html::'
          ),
          '/invoices/invoice-list.html::',
          '/invoices/create-invoice.html::'
        )
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/invoices/%list.html::%';
    $q$, target_table);
  END LOOP;
END $$;

-- ===== Migration: 20260409_remove_obsolete_access_page_links.sql =====
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['user_accesses', 'user_access']
  LOOP
    IF to_regclass(format('public.%s', target_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format($q$
      WITH expanded AS (
        SELECT
          id,
          COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages,
          COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
        FROM %I
      ),
      pages_clean AS (
        SELECT
          id,
          COALESCE(
            jsonb_agg(page_value) FILTER (
              WHERE lower(page_value) NOT IN (
                '/invoices/view-quotation.html',
                '/invoices/view-quotation-2.html',
                '/invoices/view-quotation-3.html',
                '/users/technician-list.html',
                '/users/add-technician.html',
                '/users/edit-technician.html',
                '/customers/add-customer.html',
                '/customers/customer-list.html'
              )
            ),
            '[]'::jsonb
          ) AS next_pages
        FROM expanded e
        LEFT JOIN LATERAL (
          SELECT jsonb_array_elements_text(e.pages) AS page_value
        ) p ON TRUE
        GROUP BY id
      ),
      actions_clean AS (
        SELECT
          id,
          COALESCE(
            jsonb_agg(action_value) FILTER (
              WHERE lower(split_part(action_value, '::', 1)) NOT IN (
                '/invoices/view-quotation.html',
                '/invoices/view-quotation-2.html',
                '/invoices/view-quotation-3.html',
                '/users/technician-list.html',
                '/users/add-technician.html',
                '/users/edit-technician.html',
                '/customers/add-customer.html',
                '/customers/customer-list.html'
              )
            ),
            '[]'::jsonb
          ) AS next_actions
        FROM expanded e
        LEFT JOIN LATERAL (
          SELECT jsonb_array_elements_text(e.actions) AS action_value
        ) a ON TRUE
        GROUP BY id
      )
      UPDATE %I t
      SET
        allowed_pages_json = p.next_pages::text,
        allowed_actions_json = a.next_actions::text
      FROM pages_clean p
      JOIN actions_clean a ON a.id = p.id
      WHERE t.id = p.id;
    $q$, target_table, target_table);
  END LOOP;
END $$;
