-- Keep profile email independent from linked account email.
-- If profile email was previously copied from account email, clear it.
UPDATE user_profiles
SET email = NULL,
    "updatedAt" = NOW()
WHERE email IS NOT NULL
  AND linked_user_email IS NOT NULL
  AND LOWER(BTRIM(email)) = LOWER(BTRIM(linked_user_email));

