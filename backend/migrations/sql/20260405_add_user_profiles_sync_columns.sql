ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS linked_database_name VARCHAR(120);

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS user_sync_at TIMESTAMP NULL;
