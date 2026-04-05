DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_accesses'
  ) THEN
    -- Remove stock page from saved allowed pages list.
    UPDATE user_accesses
    SET allowed_pages_json = REPLACE(
      REPLACE(
        REPLACE(COALESCE(allowed_pages_json, '[]'), '"/stock/stock.html",', ''),
        ',"/stock/stock.html"', ''
      ),
      '"/stock/stock.html"', ''
    );

    -- Remove stock actions from saved allowed actions list.
    UPDATE user_accesses
    SET allowed_actions_json = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(COALESCE(allowed_actions_json, '[]'), '"/stock/stock.html::view",', ''),
            ',"/stock/stock.html::view"', ''
          ),
          '"/stock/stock.html::view"', ''
        ),
        '"/stock/stock.html::edit",', ''
      ),
      ',"/stock/stock.html::edit"', ''
    );

    UPDATE user_accesses
    SET allowed_actions_json = REPLACE(COALESCE(allowed_actions_json, '[]'), '"/stock/stock.html::edit"', '');
  END IF;
END $$;

