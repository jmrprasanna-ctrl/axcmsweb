CREATE TABLE IF NOT EXISTS general_machines (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id),
  customer_name VARCHAR(100) NOT NULL,
  address TEXT,
  model VARCHAR(100) NOT NULL,
  machine_title VARCHAR(150) NOT NULL,
  serial_no VARCHAR(100),
  start_count INT DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE general_machines
ADD COLUMN IF NOT EXISTS entry_date DATE;

UPDATE general_machines
SET entry_date = COALESCE(entry_date, DATE("createdAt"), CURRENT_DATE)
WHERE entry_date IS NULL;

CREATE INDEX IF NOT EXISTS general_machines_entry_date_idx
ON general_machines(entry_date);
