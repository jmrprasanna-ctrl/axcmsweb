const db = require("../config/database");

const BUSINESS_DBS = ["axiscmsdb", "demo"];

const SAMPLE_CUSTOMER_EMAILS = ["cust1@example.com", "cust2@example.com"];
const SAMPLE_CUSTOMER_CODES = ["CS01", "CS02"];

async function deleteReturningCount(sql, replacements = {}) {
  const [rows] = await db.query(sql, { replacements });
  return Array.isArray(rows) ? rows.length : 0;
}

async function cleanupOneDatabase(databaseName) {
  const report = {
    expenses: 0,
    invoiceItems: 0,
    invoices: 0,
    customers: 0,
    users: 0,
  };

  await db.withDatabase(databaseName, async () => {
    await db.transaction(async () => {
      report.expenses += await deleteReturningCount(
        `DELETE FROM expenses
         WHERE (title = 'Office Rent' AND amount = 50000)
            OR (title = 'Electricity Bill' AND amount = 15000)
         RETURNING id`
      );

      report.invoiceItems += await deleteReturningCount(
        `DELETE FROM invoice_items
         WHERE invoice_id IN (
           SELECT i.id
           FROM invoices i
           JOIN customers c ON c.id = i.customer_id
           WHERE c.email IN (:emails) OR c.customer_id IN (:codes)
         )
         RETURNING id`,
        {
          emails: SAMPLE_CUSTOMER_EMAILS,
          codes: SAMPLE_CUSTOMER_CODES,
        }
      );

      report.invoices += await deleteReturningCount(
        `DELETE FROM invoices
         WHERE customer_id IN (
           SELECT id FROM customers
           WHERE email IN (:emails) OR customer_id IN (:codes)
         )
         RETURNING id`
        ,
        {
          emails: SAMPLE_CUSTOMER_EMAILS,
          codes: SAMPLE_CUSTOMER_CODES,
        }
      );

      report.customers += await deleteReturningCount(
        `DELETE FROM customers
         WHERE email IN (:emails)
            OR customer_id IN (:codes)
         RETURNING id`,
        {
          emails: SAMPLE_CUSTOMER_EMAILS,
          codes: SAMPLE_CUSTOMER_CODES,
        }
      );

      report.users += await deleteReturningCount(
        `DELETE FROM users
         WHERE email = 'manager@example.com'
           AND username = 'manager'
           AND role = 'manager'
         RETURNING id`
      );
    });
  });

  return report;
}

async function main() {
  try {
    await db.authenticate();
    console.log("Database connection: OK");

    for (const databaseName of BUSINESS_DBS) {
      const report = await cleanupOneDatabase(databaseName);
      console.log(`\n[${databaseName}] Removed system test data:`);
      Object.entries(report).forEach(([name, count]) => {
        console.log(`- ${name}: ${count}`);
      });
    }

    console.log("\nCleanup complete.");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err.message || err);
    process.exit(1);
  }
}

main();
