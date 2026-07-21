const prisma = require("../utils/prisma");
const { createLoadsSafely } = require("../utils/loadDedup");

const generateInvoiceNumber = async (branchId) => {
  const count = await prisma.invoice.count({
    where: { branchId: Number(branchId) }
  });

  const nextNumber = count + 1;
  return `INV-${String(nextNumber).padStart(5, "0")}`;
};

const calculateInvoice = (data) => {
  const loads = data.loads || [];
  const billingType = data.billingType || "PERCENTAGE";

  let totalLoadAmount = 0;
  let totalDispatchAmount = 0;

  const dispatchPercent = Number(data.dispatchPercent || 0);
  const fixedMonthlyRate = Number(data.fixedMonthlyRate || 0);
  const selectedTruckCount = Number(data.selectedTruckCount || 0);
  const truckRateBreakdown = Array.isArray(data.truckRateBreakdown)
    ? data.truckRateBreakdown
    : [];

  const calculatedLoads = loads.map((load) => {
    const loadAmount = Number(load.loadAmount || 0);
    let dispatchAmount = 0;

    if (billingType === "PERCENTAGE") {
      dispatchAmount = (loadAmount * dispatchPercent) / 100;
    }

    totalLoadAmount += loadAmount;
    totalDispatchAmount += dispatchAmount;

    return {
      date: new Date(load.date),
      pickup: load.pickup,
      dropoff: load.dropoff,
      loadAmount,
      dispatchPercent: billingType === "PERCENTAGE" ? dispatchPercent : 0,
      dispatchAmount
    };
  });

  const fixedBillingAmount =
    billingType === "FIXED"
      ? truckRateBreakdown.length > 0
        ? truckRateBreakdown.reduce(
            (sum, truck) => sum + Number(truck.rate || 0),
            0
          )
        : fixedMonthlyRate * selectedTruckCount
      : 0;

  if (billingType === "FIXED") {
    totalDispatchAmount = fixedBillingAmount;
  }

  const accountsFeeWeeks = Number(data.accountsFeeWeeks || 0);
  const accountsFeeRate = Number(data.accountsFeeRate || 0);
  const accountsFeeTotal = accountsFeeWeeks * accountsFeeRate;

  const grossAmount = totalDispatchAmount + accountsFeeTotal;

  const discountAmount = Number(data.discountAmount || 0);
  const referralBonus = Number(data.referralBonus || 0);
  const fineAmount = Number(data.fineAmount || 0);
  const previousInvoiceAmount = Number(data.previousInvoiceAmount || 0);

  const netPayable =
    grossAmount +
    (data.includePreviousInvoiceInNet ? previousInvoiceAmount : 0) -
    discountAmount -
    referralBonus -
    fineAmount;

  return {
    calculatedLoads,
    totalLoadAmount,
    totalDispatchAmount,
    fixedBillingAmount,
    truckRateBreakdown,
    accountsFeeTotal,
    grossAmount,
    netPayable
  };
};

const createInvoice = async (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const calculated = calculateInvoice(req.body);

    const invoiceNumber =
      req.body.invoiceNumber || (await generateInvoiceNumber(branchId));

    const invoice = await prisma.invoice.create({
      data: {
        branchId: Number(branchId),
        companyId: req.body.companyId ? Number(req.body.companyId) : null,

        companyName: req.body.companyName || null,
        ownerName: req.body.ownerName || null,
        mcNumber: req.body.mcNumber || null,
        dotNumber: req.body.dotNumber || null,
        address: req.body.address || null,
        contactNumber: req.body.contactNumber || null,
        email: req.body.email || null,

        billingType: req.body.billingType || "PERCENTAGE",
        dispatchPercent: Number(req.body.dispatchPercent || 0),
        fixedMonthlyRate: Number(req.body.fixedMonthlyRate || 0),

        truckNumbers: req.body.truckNumbers || null,
        driverNames: req.body.driverNames || null,

        invoiceNumber,
        invoiceStart: new Date(req.body.invoiceStart),
        invoiceEnd: new Date(req.body.invoiceEnd),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,

        accountNumber: req.body.accountNumber || null,
        accountTitle: req.body.accountTitle || null,

        accountsFeeWeeks: Number(req.body.accountsFeeWeeks || 0),
        accountsFeeRate: Number(req.body.accountsFeeRate || 0),
        accountsFeeTotal: calculated.accountsFeeTotal,

        totalLoadAmount: calculated.totalLoadAmount,
        totalDispatchAmount: calculated.totalDispatchAmount,
        fixedBillingAmount: calculated.fixedBillingAmount,
        truckRateBreakdown:
          calculated.truckRateBreakdown.length > 0
            ? calculated.truckRateBreakdown
            : undefined,
        grossAmount: calculated.grossAmount,

        discountAmount: Number(req.body.discountAmount || 0),
        referralBonus: Number(req.body.referralBonus || 0),
        fineAmount: Number(req.body.fineAmount || 0),
        fineReason: req.body.fineReason || null,

        previousInvoiceAmount: Number(req.body.previousInvoiceAmount || 0),
        includePreviousInvoiceInNet: Boolean(req.body.includePreviousInvoiceInNet),

        netPayable: calculated.netPayable,
        notes: req.body.notes || null,

        loads: {
          create: calculated.calculatedLoads
        }
      },
      include: {
        loads: true
      }
    });

    // Save manual loads that don't already exist (smart deduplication)
    const loadSaveResults = await createLoadsSafely(
      invoice.loads.map((load) => ({
        branchId: Number(branchId),
        companyId: req.body.companyId ? Number(req.body.companyId) : null,
        truckId: req.body.selectedTruckIds?.[0] ? Number(req.body.selectedTruckIds[0]) : null,
        driverId: req.body.selectedDriverIds?.[0] ? Number(req.body.selectedDriverIds[0]) : null,

        companyName: invoice.companyName,
        truckNumber: invoice.truckNumbers,
        driverName: invoice.driverNames,

        loadDate: load.date,
        pickupDate: load.date,
        dropoffDate: null,

        pickup: load.pickup,
        dropoff: load.dropoff,

        miles: 0,
        ratePerMile: 0,
        grossAmount: Number(load.loadAmount || 0),

        loadAmount: Number(load.loadAmount || 0),
        dispatchPercent: Number(load.dispatchPercent || 0),
        dispatchAmount: Number(load.dispatchAmount || 0),

        source: "MANUAL"
      }))
    );

    res.status(201).json({
      message: "Invoice created successfully",
      invoice,
      loadsSaved: {
        created: loadSaveResults.created.length,
        duplicates: loadSaveResults.duplicates.length,
        errors: loadSaveResults.errors.length,
        details: {
          created: loadSaveResults.created,
          duplicates: loadSaveResults.duplicates,
          errors: loadSaveResults.errors
        }
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Server error"
    });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { branchId, companyId, from, to } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    if (companyId) {
      where.companyId = Number(companyId);
    }

    if (from || to) {
      where.invoiceStart = {};

      if (from) where.invoiceStart.gte = new Date(from);
      if (to) where.invoiceStart.lte = new Date(to);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        loads: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(invoices);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Server error"
    });
  }
};

const getInvoicesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { from, to } = req.query;

    const where = { branchId: Number(branchId) };

    if (from || to) {
      where.invoiceStart = {};

      if (from) where.invoiceStart.gte = new Date(from);
      if (to) where.invoiceStart.lte = new Date(to);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        loads: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(invoices);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Server error"
    });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invoice ID is required" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) }
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Delete related invoice loads first
    await prisma.invoiceLoad.deleteMany({
      where: { invoiceId: Number(id) }
    });

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({
      message: "Invoice deleted successfully",
      id: Number(id)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoicesByBranch,
  deleteInvoice
};