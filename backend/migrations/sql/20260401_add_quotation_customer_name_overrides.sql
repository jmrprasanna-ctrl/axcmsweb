ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation2_customer_name VARCHAR(255);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quotation3_customer_name VARCHAR(255);
