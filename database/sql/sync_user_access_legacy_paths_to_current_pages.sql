-- Manual DB sync helper (matches backend migration)
-- Run in the main DB when needed to align old saved access paths.

DO $$
BEGIN
  IF to_regclass('public.user_accesses') IS NOT NULL THEN
    UPDATE user_accesses
    SET allowed_pages_json =
      REPLACE(
        REPLACE(
          REPLACE(COALESCE(allowed_pages_json, '[]'),
            '"/customers/customer-list.html"',
            '"/customers/client-list.html"'
          ),
          '"/customers/add-customer.html"',
          '"/customers/add-client.html"'
        ),
        '"/invoices/invoice-list.html"',
        '"/invoices/payments-list.html"'
      )
    WHERE COALESCE(allowed_pages_json, '') <> '';

    UPDATE user_accesses
    SET allowed_actions_json =
      REPLACE(
        REPLACE(
          REPLACE(COALESCE(allowed_actions_json, '[]'),
            '/customers/customer-list.html::',
            '/customers/client-list.html::'
          ),
          '/customers/add-customer.html::',
          '/customers/add-client.html::'
        ),
        '/invoices/invoice-list.html::',
        '/invoices/payments-list.html::'
      )
    WHERE COALESCE(allowed_actions_json, '') <> '';
  END IF;
END $$;
