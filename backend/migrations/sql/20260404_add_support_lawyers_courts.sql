CREATE TABLE IF NOT EXISTS lawyers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lawyers_name_unique_lower_idx
ON lawyers ((LOWER(name)));

CREATE TABLE IF NOT EXISTS courts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS courts_name_unique_lower_idx
ON courts ((LOWER(name)));
