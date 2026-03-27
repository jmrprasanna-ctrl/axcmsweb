ALTER TABLE rental_machines
ADD COLUMN IF NOT EXISTS entry_date DATE;

UPDATE rental_machines
SET entry_date = COALESCE(entry_date, DATE("createdAt"), CURRENT_DATE)
WHERE entry_date IS NULL;

CREATE INDEX IF NOT EXISTS rental_machines_entry_date_idx
ON rental_machines(entry_date);
