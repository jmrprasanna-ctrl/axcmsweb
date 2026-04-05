ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS company_code VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_company_code_unique_idx
ON company_profiles (UPPER(company_code))
WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';

CREATE INDEX IF NOT EXISTS user_mappings_user_company_idx
ON user_mappings (user_id, company_profile_id);
