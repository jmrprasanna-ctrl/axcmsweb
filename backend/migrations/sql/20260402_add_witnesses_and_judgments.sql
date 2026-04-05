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
