CREATE INDEX IF NOT EXISTS user_mappings_user_id_idx
ON user_mappings (user_id);

CREATE INDEX IF NOT EXISTS user_mappings_database_name_idx
ON user_mappings (LOWER(database_name));

CREATE INDEX IF NOT EXISTS user_mappings_company_profile_id_idx
ON user_mappings (company_profile_id);

