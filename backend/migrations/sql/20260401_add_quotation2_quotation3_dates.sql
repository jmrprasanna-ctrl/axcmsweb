ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation2_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation3_date DATE DEFAULT CURRENT_DATE;

UPDATE invoices
SET quotation2_date = COALESCE(quotation2_date, quotation_date, invoice_date, DATE("createdAt"), CURRENT_DATE)
WHERE quotation2_date IS NULL;

UPDATE invoices
SET quotation3_date = COALESCE(quotation3_date, quotation_date, invoice_date, DATE("createdAt"), CURRENT_DATE)
WHERE quotation3_date IS NULL;
