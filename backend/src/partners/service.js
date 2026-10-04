const crypto = require('node:crypto');
const { fail, hash, encrypt, decrypt, passport } = require('./security');
const { preview } = require('./template');
const FIELDS = 'p."id", p."branchId", p."settings", p."termsText", p."documentHash", p."status", p."signatures", p."createdAt", p."updatedAt"';
const id = value => { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) fail('Invalid record or branch.'); return n; };
const tokenHash = token => { if (!/^[a-f0-9]{64}$/.test(token || '')) fail('Signing link not found.', 404); return hash(token); };
const normalized = name => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
function createPartnerService(db) {
 async function publicRecord(token) {
  const digest = tokenHash(token);
  const [row] = await db.$queryRawUnsafe(`SELECT ${FIELDS}, b."isActive", CASE WHEN p."managerTokenHash"=$1 THEN 'manager' ELSE 'silent' END AS "role" FROM "PartnerAgreement" p JOIN "Branch" b ON b.id=p."branchId" WHERE p."managerTokenHash"=$1 OR p."silentTokenHash"=$1`, digest);
  if (!row) fail('Signing link not found.', 404);
  row.allowedDocumentTypes = row.termsText.includes('Template pa-dispatch-members-v2') ? ['PASSPORT','DRIVING_LICENSE'] : ['PASSPORT'];
  row.canSign = row.isActive && ['PENDING','PARTIALLY_SIGNED'].includes(row.status) && !row.signatures[row.role];
  delete row.isActive;
  delete row.branchId;
  return row;
 }
 async function detail(recordId, branchId) {
  const [row] = await db.$queryRawUnsafe(`SELECT ${FIELDS}, p."encryptedLinks" FROM "PartnerAgreement" p WHERE p.id=$1 AND p."branchId"=$2`, id(recordId), id(branchId));
  if (!row) fail('Agreement not found.', 404);
  row.links = JSON.parse(decrypt(row.encryptedLinks, 'links:' + row.documentHash).toString());
  delete row.encryptedLinks;
  return row;
 }
 return {
  preview,
  async list(branchId) {
   return db.$queryRawUnsafe('SELECT "id", "settings"->>\'managerName\' AS "managerName", "settings"->>\'silentName\' AS "silentName", "status", "createdAt" FROM "PartnerAgreement" WHERE "branchId"=$1 ORDER BY "createdAt" DESC LIMIT 200', id(branchId));
  },
  async create(input, userId) {
   const draft = preview(input);
   if (input.reviewed !== true || input.documentHash !== draft.documentHash) fail('Preview and confirm the current agreement before creating signing links.');
   const links = { manager: crypto.randomBytes(32).toString('hex'), silent: crypto.randomBytes(32).toString('hex') };
   const [row] = await db.$queryRawUnsafe(`INSERT INTO "PartnerAgreement" ("branchId","settings","termsText","documentHash","managerTokenHash","silentTokenHash","encryptedLinks","createdBy") SELECT b.id,$2::jsonb,$3,$4,$5,$6,$7,$8 FROM "Branch" b WHERE b.id=$1 AND b."isActive"=true RETURNING id`, id(input.branchId), JSON.stringify(draft.settings), draft.termsText, draft.documentHash, hash(links.manager), hash(links.silent), encrypt(JSON.stringify(links), 'links:' + draft.documentHash), id(userId));
   if (!row) fail('An active branch is required.', 409);
   return detail(row.id, input.branchId);
  },
  detail,
  publicGet: publicRecord,
  async respond(token, input) {
   const row = await publicRecord(token);
   if (!row.canSign) fail('This signing slot is already signed or the agreement is closed. Refresh to view its current status.', 409);
   if (input.documentHash !== row.documentHash) fail('The agreement does not match. Reload and review it again.', 409);
   if (!['sign','reject'].includes(input.action)) fail('Choose sign or decline.');
   const name = String(input.signedName || '').trim().replace(/\s+/g, ' ');
   if (normalized(name) !== normalized(row.settings[row.role + 'Name'])) fail('Type the full name of the designated partner shown above.');
   let identity = {}, signatures = {};
   if (input.action === 'sign') {
    if (input.consent !== true || input.identityConsent !== true) fail('Electronic-signature and private identity-document consent are required.');
    const p = passport(input);
    if (!row.allowedDocumentTypes.includes(p.documentType)) fail('This issued agreement requires a passport. Ask the administrator to issue a new agreement to use a driving licence.');
    signatures[row.role] = { name, role: row.role, signedAt: new Date().toISOString(), documentHash: row.documentHash, documentType: p.documentType, passportLast4: p.number.slice(-4), passportCountry: p.country, consentVersion: 'partner-esign-identity-v1', fileDigest: p.digest };
    identity[row.role] = encrypt(JSON.stringify({ documentType: p.documentType, number: p.number, country: p.country, mime: p.mime, base64: p.bytes.toString('base64') }), `identity:${row.id}:${row.role}:${row.documentHash}`);
   }
   // Merge in PostgreSQL so simultaneous signatures cannot overwrite each other.
   // Identity, receipt, and fully-signed status are committed in the SAME statement.
   const rows = await db.$queryRawUnsafe(`UPDATE "PartnerAgreement" p SET "signatures"=p."signatures" || $3::jsonb, "privateIdentity"=p."privateIdentity" || $4::jsonb, "status"=CASE WHEN $5='reject' THEN 'REJECTED' WHEN (p."signatures" || $3::jsonb) ? 'manager' AND (p."signatures" || $3::jsonb) ? 'silent' THEN 'SIGNED' ELSE 'PARTIALLY_SIGNED' END, "revision"="revision"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE p.id=$1 AND p."documentHash"=$6 AND p."status" IN ('PENDING','PARTIALLY_SIGNED') AND NOT (p."signatures" ? $2) AND EXISTS (SELECT 1 FROM "Branch" b WHERE b.id=p."branchId" AND b."isActive"=true) RETURNING p.id`, row.id, row.role, JSON.stringify(signatures), JSON.stringify(identity), input.action, row.documentHash);
   if (!rows.length) fail('The agreement changed or this partner already signed. Refresh to see the saved result.', 409);
   return publicRecord(token);
  },
  async cancel(recordId, branchId) {
   const rows = await db.$queryRawUnsafe(`UPDATE "PartnerAgreement" p SET "status"='CANCELLED', "revision"="revision"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE p.id=$1 AND p."branchId"=$2 AND p."status" IN ('PENDING','PARTIALLY_SIGNED') AND EXISTS (SELECT 1 FROM "Branch" b WHERE b.id=p."branchId" AND b."isActive"=true) RETURNING id`, id(recordId), id(branchId));
   if (!rows.length) fail('Only open agreements in the active branch can be cancelled.', 409);
   return { status: 'CANCELLED' };
  },
  async identity(recordId, branchId, role) {
   if (!['manager','silent'].includes(role)) fail('Invalid signer.');
   const [row] = await db.$queryRawUnsafe('SELECT "documentHash", "privateIdentity" ->> $3 AS identity FROM "PartnerAgreement" WHERE id=$1 AND "branchId"=$2', id(recordId), id(branchId), role);
   if (!row?.identity) fail('No identity document has been submitted for this partner.', 404);
   return JSON.parse(decrypt(row.identity, `identity:${id(recordId)}:${role}:${row.documentHash}`).toString());
  }
 };
}
module.exports = { createPartnerService };
