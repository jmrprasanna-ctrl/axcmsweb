BEGIN;

CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_no VARCHAR(120) UNIQUE NOT NULL,
  case_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  court VARCHAR(255) NOT NULL,
  attend_lawyer VARCHAR(255) NOT NULL,
  comment TEXT,
  upload_method VARCHAR(40),
  uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cases_case_date_idx ON cases(case_date);
CREATE INDEX IF NOT EXISTS cases_customer_name_idx ON cases(customer_name);

CREATE TABLE IF NOT EXISTS plaints (
  id SERIAL PRIMARY KEY,
  plaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  case_no VARCHAR(120) NOT NULL,
  court VARCHAR(255) NOT NULL,
  attend_lawyer VARCHAR(255) NOT NULL,
  comment TEXT,
  upload_method VARCHAR(40),
  uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer TEXT,
  witness_list TEXT,
  dudgement TEXT,
  finished BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plaints_case_id_idx ON plaints(case_id);
CREATE INDEX IF NOT EXISTS plaints_plaint_date_idx ON plaints(plaint_date);
CREATE INDEX IF NOT EXISTS plaints_case_no_idx ON plaints(case_no);

COMMIT;
