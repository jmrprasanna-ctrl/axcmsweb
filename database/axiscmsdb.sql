-- AXIS CMS unified database SQL
-- Consolidated from legacy base schema and historical migrations
-- Canonical single SQL file for schema setup and migration baseline

-- ===== Base schema =====
                             
                            
                             
-- ==========================
-- Database: axiscmsdb
-- ==========================

                            
-- NOTE:
-- Destructive DROP TABLE reset commands were moved to:
-- database/reset_dev_only.sql
-- Keep canonical baseline SQL non-destructive.

                             
              
                             
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    department VARCHAR(100),
    telephone VARCHAR(50),
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    password VARCHAR(255) NOT NULL,
    password_plain VARCHAR(255),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);
                        


-- ===== Migration: 20260420_prevent_multi_click_duplicate_saves.sql =====
-- Add idempotency request tokens for edit flows (plaint/answer/witness/judgment).
-- This allows frontend + backend to treat repeated clicks as one logical save.

ALTER TABLE plaints
ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(80);

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(80);

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(80);

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS ux_plaints_client_request_id
ON plaints (client_request_id)
WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_answers_client_request_id
ON answers (client_request_id)
WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_witnesses_client_request_id
ON witnesses (client_request_id)
WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_judgments_client_request_id
ON judgments (client_request_id)
WHERE client_request_id IS NOT NULL;

-- ===== Migration: 20260410_add_google_drive_sync_tables.sql =====
CREATE TABLE IF NOT EXISTS google_drive_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    client_id VARCHAR(300),
    client_secret VARCHAR(300),
    refresh_token TEXT,
    root_folder_name VARCHAR(200) DEFAULT 'AXIS_CMS_DRAWYER',
    root_folder_id VARCHAR(200),
    auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
    compress_before_upload BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_drive_file_syncs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    source_table VARCHAR(40) NOT NULL,
    source_id INTEGER NOT NULL,
    case_no VARCHAR(120),
    module_name VARCHAR(40) NOT NULL,
    file_index INTEGER NOT NULL DEFAULT 0,
    file_hash VARCHAR(80) NOT NULL,
    drive_file_id VARCHAR(200),
    drive_web_view_link TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    last_error TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, file_hash)
);
                       
                    
                             
CREATE TABLE IF NOT EXISTS ui_settings (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(120) NOT NULL DEFAULT 'AXIS_CMS_WEB',
    footer_text VARCHAR(255) NOT NULL DEFAULT '© All Right Recieved with CRONIT SOLLUTIONS - JMR Prasanna.',
    primary_color VARCHAR(24) NOT NULL DEFAULT '#0f6abf',
    accent_color VARCHAR(24) NOT NULL DEFAULT '#11a36f',
    background_color VARCHAR(24) NOT NULL DEFAULT '#edf3fb',
    button_color VARCHAR(24) NOT NULL DEFAULT '#0f6abf',
    mode_theme VARCHAR(16) NOT NULL DEFAULT 'light',
    logo_path VARCHAR(500),
    invoice_template_pdf_path VARCHAR(500),
    quotation_template_pdf_path VARCHAR(500),
    quotation2_template_pdf_path VARCHAR(500),
    quotation3_template_pdf_path VARCHAR(500),
    sign_c_path VARCHAR(500),
    sign_v_path VARCHAR(500),
    seal_c_path VARCHAR(500),
    seal_v_path VARCHAR(500),
    sign_q2_path VARCHAR(500),
    seal_q2_path VARCHAR(500),
    sign_q3_path VARCHAR(500),
    seal_q3_path VARCHAR(500),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_quotation_render_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    database_name VARCHAR(120) NOT NULL,
    quotation_type VARCHAR(32) NOT NULL,
    render_visibility_json TEXT NOT NULL DEFAULT '{}',
    render_overrides_json TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, database_name, quotation_type)
);

                                                           

                                                                 
CREATE TABLE IF NOT EXISTS user_preference_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    logo_path VARCHAR(500),
    invoice_template_pdf_path VARCHAR(500),
    quotation_template_pdf_path VARCHAR(500),
    quotation2_template_pdf_path VARCHAR(500),
    quotation3_template_pdf_path VARCHAR(500),
    sign_c_path VARCHAR(500),
    sign_v_path VARCHAR(500),
    seal_c_path VARCHAR(500),
    seal_v_path VARCHAR(500),
    primary_color VARCHAR(24),
    background_color VARCHAR(24),
    button_color VARCHAR(24),
    mode_theme VARCHAR(16),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
                                                               

                                                                            
CREATE TABLE IF NOT EXISTS company_profiles (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) UNIQUE NOT NULL,
  company_code VARCHAR(40),
  email VARCHAR(200),
  folder_name VARCHAR(120) NOT NULL,
  logo_path VARCHAR(500) NOT NULL,
  logo_file_name VARCHAR(255) NOT NULL,
  created_by INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS company_code VARCHAR(40);

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_company_code_unique_idx
ON company_profiles (UPPER(company_code))
WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';
                                                                          

                                                           
CREATE INDEX IF NOT EXISTS invoices_invoice_date_no_idx
ON invoices(invoice_date, invoice_no);
                                                         

                                                                   
CREATE TABLE IF NOT EXISTS user_mappings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  company_profile_id INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  database_name VARCHAR(120) NOT NULL,
  mapped_email VARCHAR(200),
  is_verified BOOLEAN DEFAULT FALSE,
  created_by INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_mappings
ADD COLUMN IF NOT EXISTS mapped_email VARCHAR(200);
                                                                                                                                

                                                         
CREATE INDEX IF NOT EXISTS expenses_date_idx
ON expenses(date);
                                                       

                                                              
CREATE INDEX IF NOT EXISTS invoices_pending_lookup_idx
ON invoices(payment_status, invoice_date DESC, id DESC);
                                                            
                                                       
ALTER TABLE ui_settings
ADD COLUMN IF NOT EXISTS sign_q2_path VARCHAR(500);

ALTER TABLE ui_settings
ADD COLUMN IF NOT EXISTS seal_q2_path VARCHAR(500);

ALTER TABLE ui_settings
ADD COLUMN IF NOT EXISTS sign_q3_path VARCHAR(500);

ALTER TABLE ui_settings
ADD COLUMN IF NOT EXISTS seal_q3_path VARCHAR(500);

ALTER TABLE user_preference_settings
ADD COLUMN IF NOT EXISTS sign_q2_path VARCHAR(500);

ALTER TABLE user_preference_settings
ADD COLUMN IF NOT EXISTS seal_q2_path VARCHAR(500);

ALTER TABLE user_preference_settings
ADD COLUMN IF NOT EXISTS sign_q3_path VARCHAR(500);

ALTER TABLE user_preference_settings
ADD COLUMN IF NOT EXISTS seal_q3_path VARCHAR(500);
                                                                    

                                                                      
                                                                       
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation2_customer_name VARCHAR(255);

                                                                

                                                                 
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation2_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation3_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount FLOAT DEFAULT 0;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_description VARCHAR(100);


UPDATE invoices
SET amount = COALESCE(amount, total_amount, 0)
WHERE amount IS NULL;
                                                               

                                                                       
CREATE TABLE IF NOT EXISTS user_quotation_render_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    database_name VARCHAR(120) NOT NULL,
    quotation_type VARCHAR(32) NOT NULL,
    render_visibility_json TEXT NOT NULL DEFAULT '{}',
    render_overrides_json TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, database_name, quotation_type)
);

ALTER TABLE user_quotation_render_settings
ADD COLUMN IF NOT EXISTS render_overrides_json TEXT NOT NULL DEFAULT '{}';
                                                                     

                                                             
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255);

UPDATE users
SET password_plain = password
WHERE (password_plain IS NULL OR TRIM(password_plain) = '')
  AND COALESCE(password, '') !~ '^\\$2[aby]\\$';
                                                           

-- ===== Migration: 20260402_add_answers_table.sql =====
BEGIN;

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  answer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  case_no VARCHAR(120) NOT NULL,
  court VARCHAR(255) NOT NULL,
  attend_lawyer VARCHAR(255) NOT NULL,
  comment TEXT,
  upload_method VARCHAR(40),
  uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_case_id_idx ON answers(case_id);
CREATE INDEX IF NOT EXISTS answers_answer_date_idx ON answers(answer_date);
CREATE INDEX IF NOT EXISTS answers_case_no_idx ON answers(case_no);

COMMIT;

-- ===== Migration: 20260402_add_customer_mobile_comment.sql =====
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS comment TEXT;

-- ===== Migration: 20260402_add_legal_cases_and_plaints.sql =====
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

-- ===== Migration: 20260402_add_witnesses_and_judgments.sql =====
BEGIN;

CREATE TABLE IF NOT EXISTS witnesses (
  id SERIAL PRIMARY KEY,
  witness_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  case_no VARCHAR(120) NOT NULL,
  court VARCHAR(255) NOT NULL,
  attend_lawyer VARCHAR(255) NOT NULL,
  witness_list TEXT,
  comment TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS witnesses_case_id_idx ON witnesses(case_id);
CREATE INDEX IF NOT EXISTS witnesses_answer_id_idx ON witnesses(answer_id);
CREATE INDEX IF NOT EXISTS witnesses_case_no_idx ON witnesses(case_no);
CREATE UNIQUE INDEX IF NOT EXISTS witnesses_answer_unique_idx ON witnesses(answer_id) WHERE answer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS judgments (
  id SERIAL PRIMARY KEY,
  judgment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  case_no VARCHAR(120) NOT NULL,
  court VARCHAR(255) NOT NULL,
  attend_lawyer VARCHAR(255) NOT NULL,
  judgment_text TEXT,
  comment TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS judgments_case_id_idx ON judgments(case_id);
CREATE INDEX IF NOT EXISTS judgments_case_no_idx ON judgments(case_no);
CREATE INDEX IF NOT EXISTS judgments_judgment_date_idx ON judgments(judgment_date);

COMMIT;

-- ===== Migration: 20260402_make_customer_contact_optional.sql =====
ALTER TABLE customers
ALTER COLUMN tel DROP NOT NULL;

ALTER TABLE customers
ALTER COLUMN mobile DROP NOT NULL;

ALTER TABLE customers
ALTER COLUMN email DROP NOT NULL;

-- ===== Migration: 20260402_remove_products_machines_vendors.sql =====
-- Remove Products, Machines, and Vendors domain data/tables.
-- This keeps the system focused on Dashboard + Customers flow.

BEGIN;


-- ===== Migration: 20260403_add_answer_plaint_id_and_index.sql =====
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS plaint_id INTEGER;

CREATE INDEX IF NOT EXISTS answers_plaint_id_idx ON answers(plaint_id);

-- ===== Migration: 20260403_add_case_edit_enabled.sql =====
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS edit_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ===== Migration: 20260403_add_case_next_date_and_finished_status.sql =====
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS next_date DATE;

UPDATE cases
SET case_step = CASE
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('FINISHED', 'FINISHED_STEP', 'FINISHEDSTEP') THEN 'FINISHED'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('STEP') THEN 'STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP', 'PLAINT_STEP', 'PLAINTSTEP') THEN 'PLAINT_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP') THEN 'ANSWER_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('LW_STEP', 'LWSTEP', 'L_W_STEP', 'L/W_STEP') THEN 'LW_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('DUDGMENT_STEP', 'DUDGMENTSTEP', 'JUDGMENT_STEP', 'JUDGMENTSTEP') THEN 'DUDGMENT_STEP'
  ELSE 'STEP'
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_case_step_check'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT cases_case_step_check;
  END IF;
END $$;

ALTER TABLE cases
ADD CONSTRAINT cases_case_step_check
CHECK (case_step IN ('STEP', 'PLAINT_STEP', 'ANSWER_STEP', 'LW_STEP', 'DUDGMENT_STEP', 'FINISHED'));

-- ===== Migration: 20260403_add_case_step.sql =====
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_step VARCHAR(20);

UPDATE cases
SET case_step = 'STEP'
WHERE case_step IS NULL OR TRIM(case_step) = '';

UPDATE cases
SET case_step = CASE
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE cases
ALTER COLUMN case_step SET DEFAULT 'STEP';

ALTER TABLE cases
ALTER COLUMN case_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cases_case_step_check'
      AND conrelid = 'public.cases'::regclass
  ) THEN
    ALTER TABLE cases
    ADD CONSTRAINT cases_case_step_check
    CHECK (case_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cases_case_step_idx ON cases(case_step);

-- ===== Migration: 20260403_add_cases_next_date_index.sql =====
CREATE INDEX IF NOT EXISTS idx_cases_next_date ON cases (next_date);


-- ===== Migration: 20260403_add_edit_lock_to_legal_records.sql =====
ALTER TABLE plaints
ADD COLUMN IF NOT EXISTS edit_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS edit_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS upload_method VARCHAR(50);

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS edit_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS edit_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ===== Migration: 20260403_add_judgment_uploads_finished.sql =====
BEGIN;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS upload_method VARCHAR(40);

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS finished BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE judgments
SET uploads_json = '[]'::jsonb
WHERE uploads_json IS NULL;

UPDATE judgments
SET finished = FALSE
WHERE finished IS NULL;

COMMIT;

-- ===== Migration: 20260403_add_plaint_answer_witness_steps.sql =====
ALTER TABLE plaints
ADD COLUMN IF NOT EXISTS plaint_step VARCHAR(20);

UPDATE plaints
SET plaint_step = 'STEP'
WHERE plaint_step IS NULL OR TRIM(plaint_step) = '';

UPDATE plaints
SET plaint_step = CASE
  WHEN UPPER(REPLACE(TRIM(plaint_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE plaints
ALTER COLUMN plaint_step SET DEFAULT 'STEP';

ALTER TABLE plaints
ALTER COLUMN plaint_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plaints_plaint_step_check'
      AND conrelid = 'public.plaints'::regclass
  ) THEN
    ALTER TABLE plaints
    ADD CONSTRAINT plaints_plaint_step_check
    CHECK (plaint_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plaints_plaint_step_idx ON plaints(plaint_step);

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS answer_step VARCHAR(20);

UPDATE answers
SET answer_step = 'STEP'
WHERE answer_step IS NULL OR TRIM(answer_step) = '';

UPDATE answers
SET answer_step = CASE
  WHEN UPPER(REPLACE(TRIM(answer_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE answers
ALTER COLUMN answer_step SET DEFAULT 'STEP';

ALTER TABLE answers
ALTER COLUMN answer_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'answers_answer_step_check'
      AND conrelid = 'public.answers'::regclass
  ) THEN
    ALTER TABLE answers
    ADD CONSTRAINT answers_answer_step_check
    CHECK (answer_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS answers_answer_step_idx ON answers(answer_step);

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS witness_step VARCHAR(20);

UPDATE witnesses
SET witness_step = 'STEP'
WHERE witness_step IS NULL OR TRIM(witness_step) = '';

UPDATE witnesses
SET witness_step = CASE
  WHEN UPPER(REPLACE(TRIM(witness_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE witnesses
ALTER COLUMN witness_step SET DEFAULT 'STEP';

ALTER TABLE witnesses
ALTER COLUMN witness_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'witnesses_witness_step_check'
      AND conrelid = 'public.witnesses'::regclass
  ) THEN
    ALTER TABLE witnesses
    ADD CONSTRAINT witnesses_witness_step_check
    CHECK (witness_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS witnesses_witness_step_idx ON witnesses(witness_step);

-- ===== Migration: 20260403_allow_duplicate_case_no.sql =====
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'cases'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(case_no)%'
  LOOP
    EXECUTE format('ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END$$;

-- ===== Migration: 20260403_allow_duplicate_judgment_per_case.sql =====
DROP INDEX IF EXISTS judgments_case_unique_idx;

-- ===== Migration: 20260403_backfill_stage_tables_from_case_step.sql =====
-- Backfill stage tables from existing case_step values so list pages reflect case progression.

INSERT INTO plaints (
  plaint_date,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  plaint_step,
  comment,
  upload_method,
  uploads_json,
  answer,
  witness_list,
  dudgement,
  finished,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS plaint_date,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS plaint_step,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  NULL AS answer,
  NULL AS witness_list,
  NULL AS dudgement,
  FALSE AS finished,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('PLAINT_STEP', 'PLAINTSTEP', 'NEXT_STEP', 'NEXTSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM plaints p
    WHERE p.case_id = c.id
  );

INSERT INTO answers (
  answer_date,
  plaint_id,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  answer_step,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS answer_date,
  NULL AS plaint_id,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS answer_step,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM answers a
    WHERE a.case_id = c.id
  );

INSERT INTO witnesses (
  witness_date,
  answer_id,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  witness_step,
  witness_list,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS witness_date,
  (
    SELECT a.id
    FROM answers a
    WHERE a.case_id = c.id
    ORDER BY a.answer_date DESC, a.id DESC
    LIMIT 1
  ) AS answer_id,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS witness_step,
  NULL AS witness_list,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('LW_STEP', 'LWSTEP', 'L_W_STEP')
  AND NOT EXISTS (
    SELECT 1
    FROM witnesses w
    WHERE w.case_id = c.id
  );

INSERT INTO judgments (
  judgment_date,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  judgment_text,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  finished,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS judgment_date,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  NULL AS judgment_text,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  FALSE AS finished,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('DUDGMENT_STEP', 'DUDGMENTSTEP', 'JUDGMENT_STEP', 'JUDGMENTSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM judgments j
    WHERE j.case_id = c.id
  );

-- ===== Migration: 20260403_expand_case_step_values.sql =====
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_step VARCHAR(20);

ALTER TABLE cases
DROP CONSTRAINT IF EXISTS cases_case_step_check;

UPDATE cases
SET case_step = 'STEP'
WHERE case_step IS NULL OR TRIM(case_step) = '';

UPDATE cases
SET case_step = CASE
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP', 'PLAINT_STEP', 'PLAINTSTEP') THEN 'PLAINT_STEP'
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP') THEN 'ANSWER_STEP'
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('LW_STEP', 'LWSTEP', 'L_W_STEP') THEN 'LW_STEP'
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('DUDGMENT_STEP', 'DUDGMENTSTEP', 'JUDGMENT_STEP', 'JUDGMENTSTEP') THEN 'DUDGMENT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE cases
ALTER COLUMN case_step SET DEFAULT 'STEP';

ALTER TABLE cases
ALTER COLUMN case_step SET NOT NULL;

ALTER TABLE cases
ADD CONSTRAINT cases_case_step_check
CHECK (case_step IN ('STEP', 'PLAINT_STEP', 'ANSWER_STEP', 'LW_STEP', 'DUDGMENT_STEP'));

CREATE INDEX IF NOT EXISTS cases_case_step_idx ON cases(case_step);

-- ===== Migration: 20260403_force_edit_unchecked_defaults.sql =====
UPDATE cases SET edit_enabled = FALSE;
UPDATE plaints SET edit_enabled = FALSE;
UPDATE answers SET edit_enabled = FALSE;
UPDATE witnesses SET edit_enabled = FALSE;
UPDATE judgments SET edit_enabled = FALSE;

ALTER TABLE cases ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE plaints ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE answers ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE witnesses ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE judgments ALTER COLUMN edit_enabled SET DEFAULT FALSE;

-- ===== Migration: 20260403_force_finished_from_judgment_text.sql =====
BEGIN;

UPDATE judgments
SET finished = CASE
  WHEN TRIM(COALESCE(judgment_text, '')) = '' THEN FALSE
  ELSE TRUE
END;

COMMIT;

-- ===== Migration: 20260403_make_judgment_unique_per_case.sql =====
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS judgments_case_unique_idx
ON judgments(case_id)
WHERE case_id IS NOT NULL;

COMMIT;

-- ===== Migration: 20260403_remove_analytics_access_entries.sql =====
BEGIN;

UPDATE user_accesses
SET allowed_pages_json = COALESCE((
  SELECT jsonb_agg(val)
  FROM jsonb_array_elements_text(
    COALESCE(NULLIF(TRIM(allowed_pages_json), ''), '[]')::jsonb
  ) AS val
  WHERE LOWER(val) NOT LIKE '/analytics/%'
), '[]'::jsonb)::text
WHERE allowed_pages_json IS NOT NULL;

UPDATE user_accesses
SET allowed_actions_json = COALESCE((
  SELECT jsonb_agg(val)
  FROM jsonb_array_elements_text(
    COALESCE(NULLIF(TRIM(allowed_actions_json), ''), '[]')::jsonb
  ) AS val
  WHERE LOWER(val) NOT LIKE '/analytics/%::%'
), '[]'::jsonb)::text
WHERE allowed_actions_json IS NOT NULL;

COMMIT;

-- ===== Migration: 20260403_remove_stock_access_entries.sql =====
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_accesses'
  ) THEN
    -- Remove stock page from saved allowed pages list.
    UPDATE user_accesses
    SET allowed_pages_json = REPLACE(
      REPLACE(
        REPLACE(COALESCE(allowed_pages_json, '[]'), '"/stock/stock.html",', ''),
        ',"/stock/stock.html"', ''
      ),
      '"/stock/stock.html"', ''
    );

    -- Remove stock actions from saved allowed actions list.
    UPDATE user_accesses
    SET allowed_actions_json = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(COALESCE(allowed_actions_json, '[]'), '"/stock/stock.html::view",', ''),
            ',"/stock/stock.html::view"', ''
          ),
          '"/stock/stock.html::view"', ''
        ),
        '"/stock/stock.html::edit",', ''
      ),
      ',"/stock/stock.html::edit"', ''
    );

    UPDATE user_accesses
    SET allowed_actions_json = REPLACE(COALESCE(allowed_actions_json, '[]'), '"/stock/stock.html::edit"', '');
  END IF;
END $$;


-- ===== Migration: 20260403_sync_judgment_finished_from_text.sql =====
BEGIN;

UPDATE judgments
SET finished = CASE
  WHEN COALESCE(array_length(regexp_split_to_array(TRIM(COALESCE(judgment_text, '')), E'\\s+'), 1), 0) > 0 THEN TRUE
  ELSE FALSE
END;

COMMIT;

-- ===== Migration: 20260403_update_plaint_step_to_answer_step.sql =====
UPDATE plaints
SET plaint_step = CASE
  WHEN UPPER(REPLACE(TRIM(COALESCE(plaint_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP', 'NEXT_STEP', 'NEXTSTEP') THEN 'ANSWER_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(plaint_step, '')), ' ', '_')) = 'STEP' THEN 'STEP'
  ELSE 'STEP'
END;

ALTER TABLE plaints
ALTER COLUMN plaint_step SET DEFAULT 'STEP';

ALTER TABLE plaints
ALTER COLUMN plaint_step SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plaints_plaint_step_check'
      AND conrelid = 'plaints'::regclass
  ) THEN
    ALTER TABLE plaints DROP CONSTRAINT plaints_plaint_step_check;
  END IF;
END $$;

ALTER TABLE plaints
ADD CONSTRAINT plaints_plaint_step_check
CHECK (plaint_step IN ('STEP', 'ANSWER_STEP'));

-- ===== Migration: 20260404_add_case_court_type_and_category.sql =====
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS court_type VARCHAR(40);

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS category VARCHAR(120);


-- ===== Migration: 20260404_add_company_code_login_index.sql =====
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS company_code VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_company_code_unique_idx
ON company_profiles (UPPER(company_code))
WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';

CREATE INDEX IF NOT EXISTS user_mappings_user_company_idx
ON user_mappings (user_id, company_profile_id);

-- ===== Migration: 20260404_add_support_add_pages_access.sql =====
-- Add Support add-page paths/actions into existing access JSON where Support access already exists.
WITH page_rows AS (
  SELECT
    id,
    COALESCE(allowed_pages_json, '[]')::jsonb AS pages
  FROM user_accesses
  WHERE COALESCE(allowed_pages_json, '') LIKE '%/support/support.html%'
), page_merged AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
      FROM jsonb_array_elements_text(
        pages || '["/support/add-lawyer.html","/support/add-court.html"]'::jsonb
      ) AS e(v)
    ) AS new_pages
  FROM page_rows
)
UPDATE user_accesses ua
SET allowed_pages_json = page_merged.new_pages::text
FROM page_merged
WHERE ua.id = page_merged.id;

WITH action_rows AS (
  SELECT
    id,
    COALESCE(allowed_actions_json, '[]')::jsonb AS actions
  FROM user_accesses
  WHERE COALESCE(allowed_actions_json, '') LIKE '%/support/support.html::add%'
), action_merged AS (
  SELECT
    id,
    (
      SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
      FROM jsonb_array_elements_text(
        actions || '["/support/add-lawyer.html::view","/support/add-lawyer.html::add","/support/add-court.html::view","/support/add-court.html::add"]'::jsonb
      ) AS e(v)
    ) AS new_actions
  FROM action_rows
)
UPDATE user_accesses ua
SET allowed_actions_json = action_merged.new_actions::text
FROM action_merged
WHERE ua.id = action_merged.id;

-- ===== Migration: 20260404_add_support_lawyers_courts.sql =====
CREATE TABLE IF NOT EXISTS lawyers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200),
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

-- ===== Migration: 20260404_add_todos_table_for_calendar.sql =====
BEGIN;

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  todo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER,
  assigned_to INTEGER,
  done_by INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS todo_date DATE;
ALTER TABLE todos
  ALTER COLUMN todo_date SET DEFAULT CURRENT_DATE;
UPDATE todos
SET todo_date = COALESCE(todo_date, DATE("createdAt"), CURRENT_DATE)
WHERE todo_date IS NULL;
ALTER TABLE todos
  ALTER COLUMN todo_date SET NOT NULL;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS done_by INTEGER;

CREATE INDEX IF NOT EXISTS todos_todo_date_idx ON todos(todo_date);
CREATE INDEX IF NOT EXISTS todos_assigned_to_idx ON todos(assigned_to);

COMMIT;

-- ===== Migration: 20260404_add_user_profiles_table.sql =====
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

-- ===== Migration: 20260404_backfill_company_databases_from_pg.sql =====
INSERT INTO company_databases (database_name, company_name, created_by, "createdAt", "updatedAt")
SELECT
  LOWER(TRIM(datname)) AS database_name,
  TRIM(datname) AS company_name,
  NULL,
  NOW(),
  NOW()
FROM pg_database
WHERE datistemplate = false
  AND LOWER(TRIM(datname)) NOT IN ('postgres', 'template0', 'template1')
  AND TRIM(datname) <> ''
ON CONFLICT (database_name)
DO UPDATE SET
  company_name = COALESCE(NULLIF(company_databases.company_name, ''), EXCLUDED.company_name),
  "updatedAt" = NOW();

-- ===== Cleanup: removed legacy destructive catalog-drop migrations =====
-- Old compatibility migrations that dropped active domain tables were removed.
-- Archived in database/axiscmsdb_legacy_cleanup_archive.sql for reference.

-- ===== Migration: 20260405_add_user_profiles_linked_user_email.sql =====
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS linked_user_email VARCHAR(200);

UPDATE user_profiles up
SET linked_user_email = u.email
FROM users u
WHERE up.user_id IS NOT NULL
  AND up.user_id = u.id
  AND (up.linked_user_email IS NULL OR TRIM(up.linked_user_email) = '');

-- ===== Migration: 20260405_add_user_profiles_picture_data_url.sql =====
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_data_url TEXT;

-- ===== Migration: 20260405_add_user_profiles_picture_updated_at.sql =====
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMP NULL;

-- ===== Migration: 20260405_add_user_profiles_sync_columns.sql =====
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS linked_database_name VARCHAR(120);

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS user_sync_at TIMESTAMP NULL;

-- ===== Migration: 20260405_align_user_access_default_db_axiscmsdb.sql =====
ALTER TABLE user_accesses
ALTER COLUMN user_database SET DEFAULT 'axiscmsdb';

UPDATE user_accesses
SET user_database = 'axiscmsdb'
WHERE user_database IS NULL OR TRIM(user_database) = '';

-- ===== Migration: 20260405_allow_nullable_profile_email.sql =====
ALTER TABLE user_profiles
ALTER COLUMN email DROP NOT NULL;

-- ===== Migration: 20260406_add_company_profiles_logo_data_url.sql =====
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS logo_data_url TEXT;

-- ===== Migration: 20260406_add_company_profiles_name_lookup_idx.sql =====
CREATE INDEX IF NOT EXISTS company_profiles_name_lower_idx
ON company_profiles (LOWER(company_name));


-- ===== Migration: 20260406_add_user_access_default_db_lookup_idx.sql =====
CREATE INDEX IF NOT EXISTS user_accesses_user_lookup_idx
ON user_accesses (user_id, LOWER(COALESCE(user_database, 'axiscmsdb')), "updatedAt" DESC, "createdAt" DESC, id DESC);


-- ===== Migration: 20260406_add_user_login_company_codes_table.sql =====
CREATE TABLE IF NOT EXISTS user_login_company_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  user_key VARCHAR(200) NOT NULL UNIQUE,
  company_code VARCHAR(40) NOT NULL,
  last_used_at TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);


-- ===== Migration: 20260406_add_user_mappings_lookup_indexes.sql =====
CREATE INDEX IF NOT EXISTS user_mappings_user_id_idx
ON user_mappings (user_id);

CREATE INDEX IF NOT EXISTS user_mappings_database_name_idx
ON user_mappings (LOWER(database_name));

CREATE INDEX IF NOT EXISTS user_mappings_company_profile_id_idx
ON user_mappings (company_profile_id);


-- ===== Migration: 20260406_add_user_mappings_user_db_composite_idx.sql =====
CREATE INDEX IF NOT EXISTS user_mappings_user_db_idx
ON user_mappings (user_id, LOWER(database_name));


-- ===== Migration: 20260406_add_user_profiles_user_id_updated_idx.sql =====
CREATE INDEX IF NOT EXISTS user_profiles_user_id_updated_idx
ON user_profiles (user_id, "updatedAt" DESC, id DESC);


-- ===== Migration: 20260406_backfill_company_logo_metadata.sql =====
UPDATE company_profiles
SET logo_file_name = SPLIT_PART(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '/', array_length(string_to_array(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '/'), 1))
WHERE COALESCE(BTRIM(logo_file_name), '') = ''
  AND COALESCE(BTRIM(logo_path), '') <> ''
  AND POSITION('/' IN COALESCE(logo_path, '')) > 0;

UPDATE company_profiles
SET logo_path = CONCAT('storage/companies/', folder_name, '/', logo_file_name)
WHERE COALESCE(BTRIM(folder_name), '') <> ''
  AND COALESCE(BTRIM(logo_file_name), '') <> ''
  AND (
    COALESCE(BTRIM(logo_path), '') = ''
    OR POSITION('/' IN COALESCE(logo_path, '')) = 0
  );

UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';

UPDATE company_profiles
SET logo_path = 'storage/' || logo_path
WHERE LOWER(COALESCE(logo_path, '')) LIKE 'companies/%';

-- ===== Migration: 20260406_clear_profile_email_matching_account_email.sql =====
-- Keep profile email independent from linked account email.
-- If profile email was previously copied from account email, clear it.
UPDATE user_profiles
SET email = NULL,
    "updatedAt" = NOW()
WHERE email IS NOT NULL
  AND linked_user_email IS NOT NULL
  AND LOWER(BTRIM(email)) = LOWER(BTRIM(linked_user_email));


-- ===== Migration: 20260406_db_create_permission_check.sql =====
-- Check DB create privilege status for common roles.
SELECT rolname, rolcreatedb
FROM pg_roles
WHERE rolname IN ('postgres', 'ec2-user', 'axcms-api', 'axcmsapp')
ORDER BY rolname;

-- Example (run manually with the actual API role):
-- ALTER ROLE <api_db_role> CREATEDB;


-- ===== Migration: 20260406_fix_company_logo_paths_and_fallback.sql =====
UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';

UPDATE company_profiles
SET logo_path = 'storage/' || logo_path
WHERE LOWER(COALESCE(logo_path, '')) LIKE 'companies/%';

UPDATE company_profiles
SET logo_path = CONCAT('storage/companies/', folder_name, '/', logo_file_name)
WHERE (logo_path IS NULL OR BTRIM(logo_path) = '')
  AND COALESCE(BTRIM(folder_name), '') <> ''
  AND COALESCE(BTRIM(logo_file_name), '') <> '';


-- ===== Migration: 20260406_fix_company_logo_short_paths.sql =====
UPDATE company_profiles
SET logo_path = CONCAT('storage/companies/', folder_name, '/', logo_file_name)
WHERE COALESCE(BTRIM(folder_name), '') <> ''
  AND COALESCE(BTRIM(logo_file_name), '') <> ''
  AND (
    COALESCE(BTRIM(logo_path), '') = ''
    OR POSITION('/' IN COALESCE(logo_path, '')) = 0
  );

UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';

UPDATE company_profiles
SET logo_path = 'storage/' || logo_path
WHERE LOWER(COALESCE(logo_path, '')) LIKE 'companies/%';

-- ===== Migration: 20260406_normalize_company_profile_logo_path.sql =====
UPDATE company_profiles
SET logo_path = REGEXP_REPLACE(REPLACE(COALESCE(logo_path, ''), '\\', '/'), '^(backend/|\\./|\\.\\./)+', '')
WHERE COALESCE(logo_path, '') <> '';


-- ===== Migration: 20260406_replace_inventory_user_database_with_axiscmsdb.sql =====
UPDATE user_accesses
SET user_database = 'axiscmsdb',
    "updatedAt" = NOW()
WHERE LOWER(COALESCE(user_database, '')) = 'inventory';


-- ===== Migration: 20260407_add_profile_view_access_path.sql =====
DO $$
BEGIN
  IF to_regclass('public.user_accesses') IS NOT NULL THEN
    WITH src AS (
      SELECT
        id,
        COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
      FROM user_accesses
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/users/user-list.html%'
         OR COALESCE(allowed_pages_json, '') LIKE '%/users/profile-list.html%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(pages) AS value
            UNION ALL SELECT '/users/profile-view.html'
          ) x
        ) AS pages_new
      FROM src
    )
    UPDATE user_accesses ua
    SET allowed_pages_json = expanded.pages_new::text
    FROM expanded
    WHERE ua.id = expanded.id;

    WITH src AS (
      SELECT
        id,
        COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
      FROM user_accesses
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/users/user-list.html::view%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/profile-list.html::view%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(actions) AS value
            UNION ALL SELECT '/users/profile-view.html::view'
          ) x
        ) AS actions_new
      FROM src
    )
    UPDATE user_accesses ua
    SET allowed_actions_json = expanded.actions_new::text
    FROM expanded
    WHERE ua.id = expanded.id;
  END IF;
END $$;

-- ===== Migration: 20260407_dashboard_welcome_profile_name.sql =====
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_name VARCHAR(200);

  UPDATE user_profiles
  SET profile_name = UPPER(TRIM(COALESCE(profile_name, '')))
  WHERE profile_name IS NOT NULL;

  UPDATE user_profiles
  SET profile_name = COALESCE(NULLIF(TRIM(profile_name), ''), 'USER')
  WHERE profile_name IS NULL OR TRIM(profile_name) = '';

  CREATE INDEX IF NOT EXISTS user_profiles_user_id_updated_idx
  ON user_profiles (user_id, "updatedAt" DESC, id DESC);
END $$;

-- ===== Migration: 20260407_expand_support_lawyers_courts_fields.sql =====
ALTER TABLE lawyers
ADD COLUMN IF NOT EXISTS address VARCHAR(255);

ALTER TABLE lawyers
ADD COLUMN IF NOT EXISTS area VARCHAR(150);

ALTER TABLE lawyers
ADD COLUMN IF NOT EXISTS mobile VARCHAR(60);

ALTER TABLE lawyers
ADD COLUMN IF NOT EXISTS email VARCHAR(200);

ALTER TABLE courts
ADD COLUMN IF NOT EXISTS address VARCHAR(255);

ALTER TABLE courts
ADD COLUMN IF NOT EXISTS area VARCHAR(150);

-- ===== Migration: 20260407_update_expenses_client_and_categories.sql =====
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS customer VARCHAR(255);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS client VARCHAR(255);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category VARCHAR(80);

UPDATE expenses
SET customer = COALESCE(NULLIF(TRIM(customer), ''), NULLIF(TRIM(client), ''))
WHERE customer IS NULL OR TRIM(customer) = '';

UPDATE expenses
SET client = COALESCE(NULLIF(TRIM(client), ''), NULLIF(TRIM(customer), ''))
WHERE client IS NULL OR TRIM(client) = '';

UPDATE expenses
SET category = CASE
    WHEN category IS NULL OR TRIM(category) = '' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'repair' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'customer visit' THEN 'Colombo Court Visit'
    WHEN LOWER(TRIM(category)) = 'brekdown' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'breakdown' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'miscellaneous' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'salary pay' THEN 'Sallary Pay'
    ELSE category
END;

UPDATE expenses
SET category = 'Other'
WHERE category NOT IN (
    'Lawyer Payment',
    'Colombo Court Visit',
    'Outsttion Court Visit',
    'Document Charges',
    'Failing Charges',
    'Personal',
    'Other',
    'Sallary Pay'
);

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_allowed_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_allowed_check CHECK (
    category IN (
        'Lawyer Payment',
        'Colombo Court Visit',
        'Outsttion Court Visit',
        'Document Charges',
        'Failing Charges',
        'Personal',
        'Other',
        'Sallary Pay'
    )
);

-- ===== Migration: 20260408_add_company_edit_access.sql =====
DO $$
BEGIN
  IF to_regclass('public.user_accesses') IS NOT NULL THEN
    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_pages_json, ''), '[]')::jsonb AS pages
      FROM user_accesses
      WHERE COALESCE(allowed_pages_json, '') LIKE '%/users/company-create.html%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(pages) AS value
            UNION ALL SELECT '/users/company-edit.html'
          ) x
        ) AS pages_new
      FROM src
    )
    UPDATE user_accesses ua
    SET allowed_pages_json = expanded.pages_new::text
    FROM expanded
    WHERE ua.id = expanded.id;

    WITH src AS (
      SELECT id, COALESCE(NULLIF(allowed_actions_json, ''), '[]')::jsonb AS actions
      FROM user_accesses
      WHERE COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::add%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::view%'
         OR COALESCE(allowed_actions_json, '') LIKE '%/users/company-create.html::delete%'
    ),
    expanded AS (
      SELECT
        id,
        (
          SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(value)), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(actions) AS value
            UNION ALL SELECT '/users/company-create.html::edit'
            UNION ALL SELECT '/users/company-edit.html::view'
            UNION ALL SELECT '/users/company-edit.html::edit'
          ) x
        ) AS actions_new
      FROM src
    )
    UPDATE user_accesses ua
    SET allowed_actions_json = expanded.actions_new::text
    FROM expanded
    WHERE ua.id = expanded.id;
  END IF;
END $$;

-- ===== Migration: 20260408_remove_obsolete_inv_map_flags.sql =====
ALTER TABLE user_invoice_mappings
DROP COLUMN IF EXISTS quotation_enabled,
DROP COLUMN IF EXISTS quotation2_enabled,
DROP COLUMN IF EXISTS quotation3_enabled,
DROP COLUMN IF EXISTS sign_v_enabled,
DROP COLUMN IF EXISTS seal_v_enabled,
DROP COLUMN IF EXISTS sign_q2_enabled,
DROP COLUMN IF EXISTS seal_q2_enabled,
DROP COLUMN IF EXISTS sign_q3_enabled,
DROP COLUMN IF EXISTS seal_q3_enabled;

-- ===== Cleanup: removed legacy page/action remap migrations =====
-- One-time permission JSON remaps for old routes and legacy user_access table
-- were removed from canonical baseline SQL to keep it focused on active schema.
-- Archived in database/axiscmsdb_legacy_cleanup_archive.sql for reference.
