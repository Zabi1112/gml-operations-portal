const { randomBytes, createHash } = require("node:crypto");
const { contractText } = require("./contractTemplate");
const CONSENT = "I am authorized to sign for the Carrier. I have read and agree to this agreement and consent to using my typed name as my electronic signature.";
class ContractError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function positiveId(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new ContractError(400, "A valid ID is required.");
  return n;
}
function line(value, label, max, required = true) {
  if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value) || value.trim().length > max || (required && !value.trim())) {
    throw new ContractError(400, label + " is invalid.");
  }
  return value.trim();
}
function validateInput(body) {
  const companyName = line(body.companyName, "Company name", 200);
  const companyMC = line(body.companyMC ?? "", "MC number", 40, false);
  const ratePercent = Number(body.ratePercent);
  const seats = Number(body.seats);
  if (body.ratePercent === "" || body.ratePercent == null || !["string", "number"].includes(typeof body.ratePercent) || !Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) throw new ContractError(400, "Dispatch fee must be between 0 and 100%.");
  if (body.seats === "" || body.seats == null || !["string", "number"].includes(typeof body.seats) || !Number.isSafeInteger(seats) || seats < 0 || seats > 10000) throw new ContractError(400, "Load board seats must be a whole number between 0 and 10000.");
  const effectiveDate = line(body.effectiveDate, "Effective date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || !Number.isFinite(Date.parse(effectiveDate)) || new Date(effectiveDate).toISOString().slice(0, 10) !== effectiveDate) throw new ContractError(400, "Choose a valid effective date.");
  return { branchId: positiveId(body.branchId), companyId: body.companyId ? positiveId(body.companyId) : null, companyName, companyMC, ratePercent, seats, effectiveDate };
}
function checkToken(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new ContractError(404, "Agreement link not found.");
  return token;
}
function publicDocument(row) {
  const { id, companyName, companyMC, ratePercent, seats, effectiveDate, status, termsText, documentHash, templateVersion, signerName, consentText, signedAt, respondedAt, createdAt } = row;
  return { id, companyName, companyMC, ratePercent, seats, effectiveDate, status, termsText, documentHash, templateVersion, signerName, consentText, signedAt, respondedAt, createdAt, canRespond: status === "PENDING" && row.branch?.isActive === true };
}
function createContractService(db) {
  // A shared branch lock serializes archiving/deletion against agreement writes.
  async function activeBranch(tx, id) {
    const branches = await tx.$queryRaw`SELECT "id", "isActive" FROM "Branch" WHERE "id" = ${id} FOR SHARE`;
    if (!branches[0]) throw new ContractError(404, "Branch not found.");
    if (!branches[0].isActive) throw new ContractError(409, "Historical branches are read-only.");
  }
  return {
    async create(body, userId) {
      const input = validateInput(body);
      return db.$transaction(async tx => {
        await activeBranch(tx, input.branchId);
        if (input.companyId) {
          const company = await tx.company.findUnique({ where: { id: input.companyId } });
          if (!company || company.branchId !== input.branchId) throw new ContractError(400, "Company must belong to the selected branch.");
        }
        const termsText = contractText(input);
        return tx.dispatchContract.create({ data: { ...input, termsText, documentHash: createHash("sha256").update(termsText).digest("hex"), token: randomBytes(32).toString("hex"), createdBy: userId } });
      });
    },
    async list(branchId) {
      return db.dispatchContract.findMany({ where: { branchId: positiveId(branchId) }, orderBy: { createdAt: "desc" }, select: { id: true, companyName: true, companyMC: true, ratePercent: true, status: true, token: true, signerName: true, signedAt: true, createdAt: true } });
    },
    async detail(id, branchId) {
      const row = await db.dispatchContract.findFirst({ where: { id: positiveId(id), branchId: positiveId(branchId) }, include: { branch: { select: { isActive: true } } } });
      if (!row) throw new ContractError(404, "Agreement not found in this branch.");
      return { ...publicDocument(row), token: row.token };
    },
    async publicGet(token) {
      const row = await db.dispatchContract.findUnique({ where: { token: checkToken(token) }, include: { branch: { select: { isActive: true } } } });
      if (!row) throw new ContractError(404, "Agreement link not found.");
      return publicDocument(row);
    },
    async respond(token, body) {
      checkToken(token);
      if (!["sign", "reject"].includes(body.action)) throw new ContractError(400, "Choose sign or reject.");
      const data = { status: "REJECTED", respondedAt: new Date() };
      if (body.action === "sign") {
        if (body.consent !== true) throw new ContractError(400, "Consent is required to sign.");
        Object.assign(data, { status: "SIGNED", signerName: line(body.signerName, "Full name", 150), consentText: CONSENT, signedAt: data.respondedAt });
      }
      return db.$transaction(async tx => {
        const row = await tx.dispatchContract.findUnique({ where: { token } });
        if (!row) throw new ContractError(404, "Agreement link not found.");
        await activeBranch(tx, row.branchId);
        if (body.documentHash !== row.documentHash) throw new ContractError(409, "Please reload and review the agreement before responding.");
        const result = await tx.dispatchContract.updateMany({ where: { id: row.id, status: "PENDING" }, data });
        if (result.count !== 1) throw new ContractError(409, "This agreement has already been signed, rejected, or cancelled.");
        return publicDocument({ ...row, ...data });
      });
    },
    async cancel(id, branchId) {
      id = positiveId(id); branchId = positiveId(branchId);
      return db.$transaction(async tx => {
        await activeBranch(tx, branchId);
        const result = await tx.dispatchContract.updateMany({ where: { id, branchId, status: "PENDING" }, data: { status: "CANCELLED", respondedAt: new Date() } });
        if (result.count !== 1) throw new ContractError(409, "Only a pending agreement in this branch can be cancelled.");
        return { message: "Agreement cancelled." };
      });
    },
  };
}
module.exports = { createContractService, validateInput, publicDocument, ContractError, CONSENT };
