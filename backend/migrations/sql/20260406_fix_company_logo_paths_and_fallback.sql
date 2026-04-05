UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';

UPDATE company_profiles
SET logo_path = 'storage/' || logo_path
WHERE LOWER(COALESCE(logo_path, '')) LIKE 'companies/%';

UPDATE company_profiles
SET logo_path = CONCAT('storage/companies/', folder_name, '/', logo_file_name)
WHERE (logo_path IS NULL OR BTRIM(logo_path) = '')
  AND COALESCE(BTRIM(folder_name), '') <> ''
  AND COALESCE(BTRIM(logo_file_name), '') <> '';

