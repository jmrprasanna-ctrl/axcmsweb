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
