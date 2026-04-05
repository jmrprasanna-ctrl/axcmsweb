CREATE INDEX IF NOT EXISTS company_profiles_name_lower_idx
ON company_profiles (LOWER(company_name));

