// Generates invoice numbers like INV-20260309-0001
function generateInvoiceNumber(sequence = 1, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return \INV-docs-\`n}

module.exports = { generateInvoiceNumber };
