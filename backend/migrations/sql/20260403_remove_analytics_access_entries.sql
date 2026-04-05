BEGIN;

UPDATE user_accesses
SET allowed_pages_json = COALESCE((
  SELECT jsonb_agg(val)
  FROM jsonb_array_elements_text(
    COALESCE(NULLIF(TRIM(allowed_pages_json), ''), '[]')::jsonb
  ) AS val
  WHERE LOWER(val) NOT LIKE '/analytics/%'
), '[]'::jsonb)::text
WHERE allowed_pages_json IS NOT NULL;

UPDATE user_accesses
SET allowed_actions_json = COALESCE((
  SELECT jsonb_agg(val)
  FROM jsonb_array_elements_text(
    COALESCE(NULLIF(TRIM(allowed_actions_json), ''), '[]')::jsonb
  ) AS val
  WHERE LOWER(val) NOT LIKE '/analytics/%::%'
), '[]'::jsonb)::text
WHERE allowed_actions_json IS NOT NULL;

COMMIT;
