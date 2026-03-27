CREATE INDEX IF NOT EXISTS invoices_invoice_date_no_idx
ON invoices(invoice_date, invoice_no);
