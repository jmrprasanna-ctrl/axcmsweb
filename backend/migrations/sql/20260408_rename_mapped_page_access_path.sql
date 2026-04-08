-- Rename access path keys from /users/mapped.html to /users/user-mapped.html
-- in user_accesses JSON payloads.

UPDATE user_accesses ua
SET allowed_pages_json = updated.pages_new::text
FROM (
  SELECT
    id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN page = '/users/mapped.html' THEN '/users/user-mapped.html'
          ELSE page
        END
      ),
      '[]'::jsonb
    ) AS pages_new
  FROM (
    SELECT
      id,
      jsonb_array_elements_text(COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb) AS page
    FROM user_accesses
    WHERE COALESCE(allowed_pages_json, '') LIKE '%/users/mapped.html%'
  ) s
  GROUP BY id
) updated
WHERE ua.id = updated.id;

UPDATE user_accesses ua
SET allowed_actions_json = updated.actions_new::text
FROM (
  SELECT
    id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN action LIKE '/users/mapped.html::%' THEN REPLACE(action, '/users/mapped.html::', '/users/user-mapped.html::')
          ELSE action
        END
      ),
      '[]'::jsonb
    ) AS actions_new
  FROM (
    SELECT
      id,
      jsonb_array_elements_text(COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb) AS action
    FROM user_accesses
    WHERE COALESCE(allowed_actions_json, '') LIKE '%/users/mapped.html::%'
  ) s
  GROUP BY id
) updated
WHERE ua.id = updated.id;
