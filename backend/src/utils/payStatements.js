class PayError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = message => { throw new PayError(400, message); };
function id(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) fail("A valid record ID is required.");
  return n;
}
function text(value, label, max = 200, required = false) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) || (required && !value.trim())) fail(label + " is invalid.");
  return value.trim();
}
function number(value, label, max = 1000000) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") fail(label + " is required.");
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) fail(label + " must be between 0 and " + max + ".");
  if (Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) fail(label + " allows up to two decimal places.");
  return n;
}
const cents = n => Math.round(n * 100);
function date(value, label) {
  const s = text(value, label, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s) fail(label + " is invalid.");
  return s;
}
function logo(value) {
  if (!value) return "";
  if (typeof value !== "string" || value.length > 50000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) fail("Use a small PNG company logo (maximum 37 KB).");
  const bytes = Buffer.from(value.split(",")[1], "base64");
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.readUInt32BE(16) < 1 || bytes.readUInt32BE(20) < 1 || bytes.readUInt32BE(16) > 512 || bytes.readUInt32BE(20) > 512) fail("Company logo must be a PNG up to 512 x 512 pixels.");
  return value;
}
function calculateStatement(body) {
  if (!body || !["DRIVER", "OWNER_OPERATOR"].includes(body.recipientType)) fail("Select driver or owner-operator.");
  const form = {
    companyId: body.companyId ? id(body.companyId) : null,
    driverId: body.driverId ? id(body.driverId) : null,
    truckId: body.truckId ? id(body.truckId) : null,
    companyName: text(body.companyName, "Company name", 200, true),
    mcNumber: text(body.mcNumber, "MC number", 50), dotNumber: text(body.dotNumber, "DOT number", 50),
    companyAddress: text(body.companyAddress, "Company address", 400), companyPhone: text(body.companyPhone, "Company phone", 80),
    companyLogo: logo(body.companyLogo),
    recipientType: body.recipientType,
    recipientName: text(body.recipientName, "Recipient name", 150, true),
    recipientPhone: text(body.recipientPhone, "Recipient phone", 80),
    truckNumber: text(body.truckNumber, "Truck number", 80), trailerNumber: text(body.trailerNumber, "Trailer number", 80),
    periodStart: date(body.periodStart, "Period start"), periodEnd: date(body.periodEnd, "Period end"),
    percent: number(body.percent, "Percentage", 100), weeks: number(body.weeks, "Chargeable weeks", 104),
    notes: text(body.notes, "Notes", 2000),
  };
  if (form.periodEnd < form.periodStart) fail("Period end must be on or after period start.");
  if (!Array.isArray(body.loads) || !body.loads.length || body.loads.length > 100) fail("Add between 1 and 100 loads.");
  form.loads = body.loads.map((row, i) => {
    if (!row || typeof row !== "object") fail("Invalid load row.");
    const pickupDate = date(row.pickupDate, "Load " + (i + 1) + " pickup date");
    const deliveryDate = date(row.deliveryDate, "Load " + (i + 1) + " delivery date");
    if (deliveryDate < pickupDate) fail("A delivery date cannot precede its pickup date.");
    return { sourceLoadId: row.sourceLoadId ? id(row.sourceLoadId) : null, pickupDate, deliveryDate, origin: text(row.origin, "Origin", 200, true), destination: text(row.destination, "Destination", 200, true), reference: text(row.reference, "Load reference", 80), miles: number(row.miles, "Miles"), gross: number(row.gross, "Load gross") };
  });
  function adjustments(rows, label) {
    if (!Array.isArray(rows) || rows.length > 30) fail(label + " must contain no more than 30 rows.");
    return rows.map(row => {
      if (!row || typeof row !== "object" || !["WEEKLY", "ONCE"].includes(row.frequency)) fail("Select weekly or per-statement adjustment.");
      const rate = number(row.rate, label + " amount");
      const units = row.frequency === "WEEKLY" ? Math.round(form.weeks * 100) : 100;
      return { description: text(row.description, label + " description", 160, true), frequency: row.frequency, rate, amountCents: Math.round(cents(rate) * units / 100) };
    });
  }
  form.deductions = adjustments(body.deductions, "Deduction");
  form.additions = adjustments(body.additions, "Additional earning");
  const grossCents = form.loads.reduce((sum, row) => sum + cents(row.gross), 0);
  const percentBasisPoints = Math.round(form.percent * 100);
  const percentageCents = Math.round(grossCents * percentBasisPoints / 10000);
  const feeCents = form.recipientType === "OWNER_OPERATOR" ? percentageCents : 0;
  const earnedCents = form.recipientType === "DRIVER" ? percentageCents : grossCents;
  let runningGross = 0; let previousShare = 0;
  const loads = form.loads.map(row => {
    runningGross += cents(row.gross);
    const cumulative = Math.round(runningGross * percentBasisPoints / 10000);
    const payCents = form.recipientType === "DRIVER" ? cumulative - previousShare : cents(row.gross);
    previousShare = cumulative;
    return { ...row, grossCents: cents(row.gross), payCents };
  });
  const otherDeductionsCents = form.deductions.reduce((sum, row) => sum + row.amountCents, 0);
  const additionsCents = form.additions.reduce((sum, row) => sum + row.amountCents, 0);
  const totalDeductionsCents = feeCents + otherDeductionsCents;
  const netCents = earnedCents + additionsCents - totalDeductionsCents;
  if ([grossCents, earnedCents, additionsCents, totalDeductionsCents, Math.abs(netCents)].some(n => n > 1000000000)) fail("Statement totals cannot exceed $10,000,000.");
  const totals = { grossCents, earnedCents, feeCents, otherDeductionsCents, totalDeductionsCents, additionsCents, netCents, totalMiles: Math.round(form.loads.reduce((sum, row) => sum + row.miles, 0) * 100) / 100 };
  return { form, loads, totals, currency: "USD", calculationVersion: 1 };
}
function createPayStatementService(db) {
  async function checkReferences(tx, branchId, form) {
    const branches = await tx.$queryRaw`SELECT "id", "isActive" FROM "Branch" WHERE "id" = ${branchId} FOR SHARE`;
    if (!branches[0]) throw new PayError(404, "Branch not found.");
    if (!branches[0].isActive) throw new PayError(409, "Historical branches are read-only.");
    if ((form.driverId || form.truckId) && !form.companyId) fail("Choose a company for linked drivers or trucks.");
    for (const [key, model] of [["companyId", "company"], ["driverId", "driver"], ["truckId", "truck"]]) {
      if (!form[key]) continue;
      const record = await tx[model].findUnique({ where: { id: form[key] } });
      if (!record || record.branchId !== branchId || (model !== "company" && record.companyId !== form.companyId)) fail("Selected " + model + " does not belong to this company and branch.");
    }
  }
  async function prepare(tx, body) {
    const branchId = id(body.branchId); const snapshot = calculateStatement(body);
    await checkReferences(tx, branchId, snapshot.form);
    return { branchId, snapshot };
  }
  return {
    preview: body => db.$transaction(async tx => (await prepare(tx, body)).snapshot),
    save: (body, userId, recordId) => db.$transaction(async tx => {
      const { branchId, snapshot } = await prepare(tx, body);
      const { companyId, driverId, truckId, companyName, recipientName, recipientType, periodStart, periodEnd } = snapshot.form;
      const data = { branchId, companyId, driverId, truckId, companyName, recipientName, recipientType, periodStart, periodEnd, netCents: snapshot.totals.netCents, snapshot, updatedBy: userId };
      if (recordId) {
        const statementId = id(recordId); const revision = id(body.revision);
        const changed = await tx.payStatement.updateMany({ where: { id: statementId, branchId, revision }, data: { ...data, revision: { increment: 1 } } });
        if (changed.count !== 1) throw new PayError(409, "Statement changed or was not found in this branch. Reload before editing.");
        return tx.payStatement.findUnique({ where: { id: statementId } });
      }
      return tx.payStatement.create({ data: { ...data, createdBy: userId } });
    }),
    async list(branchId, page = 1) {
      const where = { branchId: id(branchId) }; page = id(page);
      const [items, total] = await Promise.all([
        db.payStatement.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25, skip: (page - 1) * 25, select: { id: true, companyName: true, recipientName: true, recipientType: true, periodStart: true, periodEnd: true, netCents: true, revision: true, createdAt: true } }),
        db.payStatement.count({ where }),
      ]);
      return { items, total, page };
    },
    async detail(recordId, branchId) {
      const record = await db.payStatement.findFirst({ where: { id: id(recordId), branchId: id(branchId) } });
      if (!record) throw new PayError(404, "Statement not found in this branch.");
      return record;
    },
  };
}
module.exports = { calculateStatement, createPayStatementService, PayError };
