-- Payment List page removed: remap legacy invoice list paths to create-invoice.
-- Applies to both user_accesses and legacy user_access tables if present.

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
