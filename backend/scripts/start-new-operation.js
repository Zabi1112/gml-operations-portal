// Run from backend: node scripts/start-new-operation.js [--apply]
// Idempotent one-time transition. Existing records and user accounts stay in place.
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const oldName = "GML Haji Pura";
const newName = "EWL Haji Pura";
const include = {
  employees: true, companies: true, trucks: true, drivers: true,
  partners: true, dispatchers: true, invoices: { include: { loads: true } },
  loads: true, loadReports: true, loadReportReasons: true, salarySlips: true,
  settlements: true, loans: { include: { repayments: true } }
};
async function main() {
  const oldBranches = await prisma.branch.findMany({ where: { branchName: oldName }, include });
  assert.equal(oldBranches.length, 1, "Expected exactly one original branch");
  const original = oldBranches[0];
  const existing = await prisma.branch.findMany({ where: { branchName: newName } });
  if (existing.length) {
    assert.equal(existing.length, 1);
    assert.equal(original.isActive, false, "Fresh branch exists but original is not archived; review before continuing");
    console.log("Already transitioned; no changes made.");
    return;
  }
  const counts = Object.fromEntries(Object.keys(include).map(key => [key, original[key].length]));
  console.log(JSON.stringify({ previous: oldName, current: newName, preserved: counts }, null, 2));
  if (!process.argv.includes("--apply")) return;
  const backupDir = path.resolve(__dirname, "../../tmp/operation-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, "previous-operation-" + Date.now() + ".json");
  // Contains business records only, no environment secrets or user password hashes.
  fs.writeFileSync(backupPath, JSON.stringify({ capturedAt: new Date().toISOString(), branch: original }, null, 2), { flag: "wx" });
  const result = await prisma.$transaction(async tx => {
    const usersBefore = await tx.user.findMany({ orderBy: { id: "asc" } });
    const before = await tx.branch.findUnique({ where: { id: original.id }, include });
    assert.equal(before.isActive, true);
    await tx.branch.update({ where: { id: original.id }, data: { isActive: false } });
    const current = await tx.branch.create({ data: {
      branchName: newName, location: "Wazirabad", phone: "(409) 248-2002",
      email: "info@eastandwestlogistics.com", dispatcherPercent: 0, accountsPercent: 0
    }, include });
    const after = await tx.branch.findUnique({ where: { id: original.id }, include });
    for (const key of Object.keys(include)) {
      const byId = rows => [...rows].sort((a,b) => a.id - b.id);
      assert.deepEqual(byId(after[key]), byId(before[key]), "Historical records changed: " + key);
      assert.equal(current[key].length, 0, "New operation must be empty: " + key);
    }
    assert.deepEqual(await tx.user.findMany({ orderBy: { id: "asc" } }), usersBefore, "User accounts changed");
    return { currentBranchId: current.id, archivedBranchId: original.id, userAccountsPreserved: usersBefore.length };
  }, { timeout: 30000, isolationLevel: "Serializable" });
  console.log(JSON.stringify({ ...result, backupPath, verification: "All historical records and user accounts preserved; new branch empty" }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
