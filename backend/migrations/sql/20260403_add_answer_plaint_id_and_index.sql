ALTER TABLE answers
ADD COLUMN IF NOT EXISTS plaint_id INTEGER;

CREATE INDEX IF NOT EXISTS answers_plaint_id_idx ON answers(plaint_id);
