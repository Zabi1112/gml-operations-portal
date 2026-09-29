
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
 await db.$transaction(async tx => {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(48291476)");
  const rows = await tx.$queryRawUnsafe("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = to_regclass($1) AND conname = 'InterviewRecording_position_check'", "public.\"InterviewRecording\"");
  if (rows.length !== 1) throw new Error("Expected recording position constraint was not found.");
  if (rows[0].definition.includes("<= 3")) { console.log("Beginner recording support already installed."); return; }
  if (!rows[0].definition.includes("<= 2")) throw new Error("Unexpected recording position constraint.");
  if (!process.argv.includes("--apply")) { console.log("Ready: expand recording positions from 0-2 to 0-3. Existing assessments remain unchanged."); return; }
  await tx.$executeRawUnsafe('ALTER TABLE "InterviewRecording" DROP CONSTRAINT "InterviewRecording_position_check"');
  await tx.$executeRawUnsafe('ALTER TABLE "InterviewRecording" ADD CONSTRAINT "InterviewRecording_position_check" CHECK ("position" BETWEEN 0 AND 3)');
  console.log("Beginner recording support installed.");
 });
})().catch(e => { console.error("Migration failed:", e.code || e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
