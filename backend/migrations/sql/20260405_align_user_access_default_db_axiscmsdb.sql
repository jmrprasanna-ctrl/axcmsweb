ALTER TABLE user_accesses
ALTER COLUMN user_database SET DEFAULT 'axiscmsdb';

UPDATE user_accesses
SET user_database = 'axiscmsdb'
WHERE user_database IS NULL OR TRIM(user_database) = '';
