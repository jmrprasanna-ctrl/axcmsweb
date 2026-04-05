ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS linked_user_email VARCHAR(200);

UPDATE user_profiles up
SET linked_user_email = u.email
FROM users u
WHERE up.user_id IS NOT NULL
  AND up.user_id = u.id
  AND (up.linked_user_email IS NULL OR TRIM(up.linked_user_email) = '');
