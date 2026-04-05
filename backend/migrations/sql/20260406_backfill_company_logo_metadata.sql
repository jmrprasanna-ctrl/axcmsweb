UPDATE company_profiles
SET logo_file_name = SPLIT_PART(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '/', array_length(string_to_array(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '/'), 1))
WHERE COALESCE(BTRIM(logo_file_name), '') = ''
  AND COALESCE(BTRIM(logo_path), '') <> ''
  AND POSITION('/' IN COALESCE(logo_path, '')) > 0;

UPDATE company_profiles
SET logo_path = CONCAT('storage/companies/', folder_name, '/', logo_file_name)
WHERE COALESCE(BTRIM(folder_name), '') <> ''
  AND COALESCE(BTRIM(logo_file_name), '') <> ''
  AND (
    COALESCE(BTRIM(logo_path), '') = ''
    OR POSITION('/' IN COALESCE(logo_path, '')) = 0
  );

UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';

UPDATE company_profiles
SET logo_path = 'storage/' || logo_path
WHERE LOWER(COALESCE(logo_path, '')) LIKE 'companies/%';
