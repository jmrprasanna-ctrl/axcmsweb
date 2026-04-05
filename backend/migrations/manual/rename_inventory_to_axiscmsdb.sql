-- Manual migration (run with superuser from psql, not through automated SQL runner).
-- This script uses ALTER DATABASE and \connect, so do not run inside transactional migration wrappers.

-- Step 1: run while connected to postgres database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = 'inventory')
     AND NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'axiscmsdb') THEN
    EXECUTE 'ALTER DATABASE inventory RENAME TO axiscmsdb';
  END IF;
END $$;

-- Step 2: reconnect and normalize data references.
\connect axiscmsdb

UPDATE user_accesses
SET user_database = 'axiscmsdb'
WHERE user_database IS NULL
   OR TRIM(user_database) = ''
   OR LOWER(user_database) = 'inventory';

UPDATE user_accesses
SET database_name = 'axiscmsdb'
WHERE LOWER(COALESCE(database_name, '')) = 'inventory';

UPDATE user_mappings
SET database_name = 'axiscmsdb'
WHERE LOWER(COALESCE(database_name, '')) = 'inventory';

UPDATE company_databases
SET database_name = 'axiscmsdb'
WHERE LOWER(COALESCE(database_name, '')) = 'inventory';

