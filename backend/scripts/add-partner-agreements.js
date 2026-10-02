const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
 if (!process.argv.includes('--apply')) { console.log('Ready: adds the private PartnerAgreement table and index only. Use --apply to install.'); return; }
 const sql = fs.readFileSync(path.join(__dirname, '../prisma/migrations/add_partner_agreements/migration.sql'), 'utf8');
 await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(48291475)');
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
 }, { timeout: 60000 });
 console.log('Partner agreement storage installed with RLS; existing records unchanged.');
}
main().catch(e => { console.error('Migration failed:', e.code || e.name); process.exitCode = 1; }).finally(() => db.$disconnect());
