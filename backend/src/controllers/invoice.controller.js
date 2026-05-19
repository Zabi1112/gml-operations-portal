const prisma = require("../utils/prisma");

const calculateInvoice = (data) => {
  const loads = data.loads || [];
  const billingType = data.billingType || "PERCENTAGE";

  let totalLoadAmount = 0;
  let totalDispatchAmount = 0;

  const dispatchPercent = Number(data.dispatchPercent || 0);
  const fixedMonthlyRate = Number(data.fixedMonthlyRate || 0);
  const selectedTruckCount = Number(data.selectedTruckCount || 0);

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
      ? fixedMonthlyRate * selectedTruckCount
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

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const calculated = calculateInvoice(req.body);

    const invoice = await prisma.invoice.create({
      data: {
        branchId: Number(branchId),
        companyName: req.body.companyName || null,
        branchName: req.body.branchName || null,
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

        invoiceNumber: req.body.invoiceNumber || null,
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

    if (invoice.billingType === "PERCENTAGE" && invoice.loads.length > 0) {
      const truckIds = req.body.selectedTruckIds || [];
      const driverIds = req.body.selectedDriverIds || [];

      const firstTruckId = truckIds.length > 0 ? Number(truckIds[0]) : null;
      const firstDriverId = driverIds.length > 0 ? Number(driverIds[0]) : null;

      await prisma.load.createMany({
        data: invoice.loads.map((load) => ({
          branchId: Number(branchId),
          truckId: firstTruckId,
          driverId: firstDriverId,

          companyName: invoice.companyName,
          branchName: invoice.branchName,
          truckNumber: invoice.truckNumbers,
          driverName: invoice.driverNames,

          loadDate: load.date,
          pickupDate: load.date,
          dropoffDate: null,

          pickup: load.pickup,
          dropoff: load.dropoff,

          miles: Number(load.miles || 0),
          ratePerMile: Number(load.ratePerMile || 0),
          grossAmount: Number(load.grossAmount || load.loadAmount || 0),

          loadAmount: Number(load.loadAmount || 0),
          dispatchPercent: Number(load.dispatchPercent || 0),
          dispatchAmount: Number(load.dispatchAmount || 0),

          source: "INVOICE"
        }))
      });
    }

    res.status(201).json({
      message: "Invoice created successfully",
      invoice
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { branchId, from, to } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
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
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoicesByBranch
};