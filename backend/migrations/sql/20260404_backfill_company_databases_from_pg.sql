INSERT INTO company_databases (database_name, company_name, created_by, "createdAt", "updatedAt")
SELECT
  LOWER(TRIM(datname)) AS database_name,
  TRIM(datname) AS company_name,
  NULL,
  NOW(),
  NOW()
FROM pg_database
WHERE datistemplate = false
  AND LOWER(TRIM(datname)) NOT IN ('postgres', 'template0', 'template1')
  AND TRIM(datname) <> ''
ON CONFLICT (database_name)
DO UPDATE SET
  company_name = COALESCE(NULLIF(company_databases.company_name, ''), EXCLUDED.company_name),
  "updatedAt" = NOW();
