-- Add Support add-page paths/actions into existing access JSON where Support access already exists.
WITH page_rows AS (
  SELECT
    id,
    COALESCE(allowed_pages_json, '[]')::jsonb AS pages
  FROM user_accesses
  WHERE COALESCE(allowed_pages_json, '') LIKE '%/support/support.html%'
), page_merged AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
      FROM jsonb_array_elements_text(
        pages || '["/support/add-lawyer.html","/support/add-court.html"]'::jsonb
      ) AS e(v)
    ) AS new_pages
  FROM page_rows
)
UPDATE user_accesses ua
SET allowed_pages_json = page_merged.new_pages::text
FROM page_merged
WHERE ua.id = page_merged.id;

WITH action_rows AS (
  SELECT
    id,
    COALESCE(allowed_actions_json, '[]')::jsonb AS actions
  FROM user_accesses
  WHERE COALESCE(allowed_actions_json, '') LIKE '%/support/support.html::add%'
), action_merged AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
      FROM jsonb_array_elements_text(
        actions || '["/support/add-lawyer.html::view","/support/add-lawyer.html::add","/support/add-court.html::view","/support/add-court.html::add"]'::jsonb
      ) AS e(v)
    ) AS new_actions
  FROM action_rows
)
UPDATE user_accesses ua
SET allowed_actions_json = action_merged.new_actions::text
FROM action_merged
WHERE ua.id = action_merged.id;
