ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMP NULL;
