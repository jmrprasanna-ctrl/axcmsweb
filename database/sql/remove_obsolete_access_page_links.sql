-- Manual helper to remove obsolete access page links from permission JSON arrays.
-- Applies to both modern user_accesses and legacy user_access tables when present.

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
