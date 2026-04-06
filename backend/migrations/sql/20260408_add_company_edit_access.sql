DO $$
BEGIN
  IF to_regclass('public.user_accesses') IS NOT NULL THEN
    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
      FROM user_accesses
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
    UPDATE user_accesses ua
    SET allowed_pages_json = expanded.pages_new::text
    FROM expanded
    WHERE ua.id = expanded.id;

    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
      FROM user_accesses
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
    UPDATE user_accesses ua
    SET allowed_actions_json = expanded.actions_new::text
    FROM expanded
    WHERE ua.id = expanded.id;
  END IF;
END $$;

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
