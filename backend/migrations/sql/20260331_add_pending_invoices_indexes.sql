CREATE INDEX IF NOT EXISTS invoices_pending_lookup_idx
ON invoices(payment_status, invoice_date DESC, id DESC);
