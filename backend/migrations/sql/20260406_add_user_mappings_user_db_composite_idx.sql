CREATE INDEX IF NOT EXISTS user_mappings_user_db_idx
ON user_mappings (user_id, LOWER(database_name));

