const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log("Use --apply to add invoice payment method storage. No existing records are changed.");
    return;
  }

  const sql = fs.readFileSync(
    path.join(__dirname, "../prisma/migrations/add_invoice_payment_details/migration.sql"),
    "utf8"
  );
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(48291485)");
    await tx.$executeRawUnsafe(sql);
  }, { timeout: 60000 });
  console.log("Invoice payment method storage installed. No existing records were changed.");
}

main()
  .catch(error => {
    console.error("Invoice payment details migration failed:", error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
