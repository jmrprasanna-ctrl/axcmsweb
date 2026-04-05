CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  profile_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  login_user VARCHAR(120),
  company_name VARCHAR(200),
  company_code VARCHAR(40),
  department VARCHAR(120),
  section VARCHAR(120),
  address TEXT,
  telephone VARCHAR(80),
  mobile VARCHAR(80),
  profile_picture_path VARCHAR(500),
  created_by INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_email_idx
ON user_profiles (LOWER(email));
