// Safe standalone migration for this repository's manual migration history.
const path = require("node:path");
const fs = require("node:fs");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const apply = process.argv.includes("--apply");
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(48291475)`;
    const [result] = await tx.$queryRaw`SELECT to_regclass('public."InterviewAssessment"')::text AS name`;
    if (result.name) {
      // Verify that the expected fields can be selected before treating it as installed.
      await tx.interviewAssessment.findFirst();
      await tx.interviewRecording.findFirst();
      console.log("Interview table already exists; no changes made.");
      return;
    }
    if (!apply) { console.log("Ready: creates InterviewAssessment and InterviewRecording tables, indexes and RLS only. Run with --apply to install."); return; }
    const sql = fs.readFileSync(path.join(__dirname, "../prisma/migrations/add_interviews/migration.sql"), "utf8");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    console.log("Interview table installed. Existing business data and accounts were not changed.");
  }, { timeout: 30000 });
}
main().catch(error => { console.error("Interview migration failed:", error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
