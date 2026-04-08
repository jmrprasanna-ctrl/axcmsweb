-- Manual helper: map old /tools access paths to /users/backup.html.
-- Applies to both user_accesses and legacy user_access tables when present.

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
