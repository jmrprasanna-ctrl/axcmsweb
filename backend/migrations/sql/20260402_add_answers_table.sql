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
