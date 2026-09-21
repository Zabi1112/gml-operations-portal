const prisma = require("../utils/prisma");

// Inactive branches retain the previous operation and accept reads only.
function createBranchWriteGuard(db) {
  return async (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const resource = req.baseUrl.split("/").filter(Boolean).pop();
    const segments = req.path.split("/").filter(Boolean);
    const body = req.body || {};
    const branchIds = new Set();
    const validId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
    const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
    const addBranch = (value) => {
      if (!validId(value)) fail(400, "A valid branch is required");
      branchIds.add(Number(value));
    };
    const addRecord = async (model, value) => {
      if (!validId(value)) fail(400, "Invalid record ID");
      const record = await db[model].findUnique({
        where: { id: Number(value) },
        select: model === "partnerLoanRepayment" ? { loan: { select: { branchId: true } } } : { branchId: true }
      });
      if (!record) fail(404, "Record not found");
      addBranch(model === "partnerLoanRepayment" ? record.loan.branchId : record.branchId);
    };
    try {
      if (body.branchId !== undefined) addBranch(body.branchId);
      if (resource === "branches") {
        if (segments[0]) addBranch(segments[0]);
        else if (req.method === "POST") return next();
      } else if (resource === "finance") {
        const [kind, id, repaymentId] = segments;
        if (kind === "settings") addBranch(id);
        else if (kind === "clear-invoice") await addRecord("invoice", id);
        else if (kind === "loans" && id === "repayment") {
          if (repaymentId) await addRecord("partnerLoanRepayment", repaymentId);
          else await addRecord("partnerLoan", body.loanId);
        } else if (id) {
          const model = { partners: "branchPartner", dispatchers: "branchDispatcher", settlements: "invoiceSettlement", loans: "partnerLoan" }[kind];
          if (!model) fail(400, "Unknown finance operation");
          await addRecord(model, id);
        }
      } else {
        const model = { employees: "employee", companies: "company", trucks: "truck", drivers: "driver", invoices: "invoice", "salary-slips": "salarySlip", "load-reports": "loadReport", loads: "load" }[resource];
        if (!model) fail(400, "Unknown branch operation");
        if (resource === "loads" && segments[0] === "reasons") {
          if (segments[1]) await addRecord("loadReportReason", segments[1]);
        } else if (segments[0]) await addRecord(model, segments[0]);
      }
      // Prevent old-operation entities from being attached to a new branch.
      const references = { companyId: "company", truckId: "truck", driverId: "driver", employeeId: "employee", lenderPartnerId: "branchPartner", borrowerPartnerId: "branchPartner" };
      for (const [key, model] of Object.entries(references)) {
        if (body[key]) await addRecord(model, body[key]);
      }
      for (const split of body.dispatcherSplits || []) {
        if (split.dispatcherId) await addRecord("branchDispatcher", split.dispatcherId);
      }
      if (!branchIds.size) fail(400, "A branch is required for this operation");
      for (const id of branchIds) {
        const branch = await db.branch.findUnique({ where: { id }, select: { isActive: true } });
        if (!branch) fail(404, "Branch not found");
        if (!branch.isActive) fail(409, "Previous operation is read-only. Switch to a current branch to make changes.");
      }
      if (branchIds.size > 1) fail(400, "Records must belong to the same branch");
      next();
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to verify branch status" });
    }
  };
}

module.exports = { createBranchWriteGuard, branchWriteGuard: createBranchWriteGuard(prisma) };
