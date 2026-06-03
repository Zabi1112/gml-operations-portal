const prisma = require("../utils/prisma");

const calculateSettlementAmounts = (totalAmountPKR, dispatcherValue, dispatcherType, accountsValue, accountsType, partners) => {
  const dispatcherAmountPKR = (totalAmountPKR * dispatcherValue) / 100;

  let accountsAmountPKR = 0;
  if (accountsType === "PERCENTAGE") {
    accountsAmountPKR = (totalAmountPKR * accountsValue) / 100;
  } else {
    accountsAmountPKR = accountsValue;
  }

  const partnerProfitPKR = totalAmountPKR - dispatcherAmountPKR - accountsAmountPKR;

  const partnerSplits = partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    percent: Number(partner.percent || 0),
    amountPKR: (partnerProfitPKR * Number(partner.percent || 0)) / 100
  }));

  return {
    dispatcherAmountPKR,
    accountsAmountPKR,
    partnerProfitPKR,
    partnerSplits
  };
};

const getFinanceSettings = async (req, res) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: Number(req.params.branchId) },
      include: { partners: true }
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    res.json(branch);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateFinanceSettings = async (req, res) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: Number(req.params.branchId) },
      data: {
        dispatcherPercent: Number(req.body.dispatcherPercent || 25),
        accountsPercent: Number(req.body.accountsPercent || 10)
      },
      include: { partners: true }
    });

    res.json({ message: "Finance settings updated", branch });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createPartner = async (req, res) => {
  try {
    const partner = await prisma.branchPartner.create({
      data: {
        branchId: Number(req.body.branchId),
        name: req.body.name,
        percent: Number(req.body.percent || 0),
        phone: req.body.phone || null,
        notes: req.body.notes || null
      }
    });

    res.status(201).json({ message: "Partner created", partner });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deletePartner = async (req, res) => {
  try {
    await prisma.branchPartner.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Partner deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const clearInvoice = async (req, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.isCleared) {
      return res.status(400).json({ message: "Invoice already cleared" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: invoice.branchId },
      include: { partners: true }
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    const invoiceAmountUSD = Number(req.body.invoiceAmountUSD || invoice.netPayable || 0);
    const usdRate = Number(req.body.usdRate || 0);
    const totalAmountPKR = usdRate > 0 ? invoiceAmountUSD * usdRate : Number(req.body.totalAmountPKR || 0);

    const dispatcherType = "PERCENTAGE";
    const dispatcherValue = Number(req.body.dispatcherValue ?? branch.dispatcherPercent ?? 25);

    const accountsType = req.body.accountsType || "PERCENTAGE";
    const accountsValue = Number(req.body.accountsValue ?? branch.accountsPercent ?? 10);

    const { dispatcherAmountPKR, accountsAmountPKR, partnerProfitPKR, partnerSplits } =
      calculateSettlementAmounts(totalAmountPKR, dispatcherValue, dispatcherType, accountsValue, accountsType, branch.partners);

    const settlement = await prisma.invoiceSettlement.create({
      data: {
        branchId: invoice.branchId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyName: invoice.companyName,

        totalAmountPKR,
        invoiceAmountUSD,
        usdRate,
        amountType: "MIXED",

        dispatcherValue,
        dispatcherAmountPKR,

        accountsValue,
        accountsAmountPKR,

        partnerProfitPKR,
        partnerSplits,

        clearedBy: req.user?.name || req.user?.email || "Admin",
        settlementDate: new Date(),
        notes: req.body.notes || null
      }
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        isCleared: true,
        clearedAt: new Date()
      }
    });

    res.status(201).json({
      message: "Invoice cleared successfully",
      settlement
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createManualSettlement = async (req, res) => {
  try {
    const branchId = Number(req.body.branchId);
    const usdRate = Number(req.body.dollarRate || req.body.usdRate || 0);
    const invoiceAmountUSD = Number(req.body.totalAmountUSD || 0);
    const totalAmountPKR = Number(req.body.totalAmountPKR || 0);

    const dispatcherValue = Number(req.body.dispatcherValue || 0);
    const dispatcherType = req.body.dispatcherType || "PERCENTAGE";
    const accountsValue = Number(req.body.accountsValue || 0);
    const accountsType = req.body.accountsType || "PERCENTAGE";
    const companyName = req.body.companyName || "Manual Settlement";
    const settlementDate = new Date(req.body.settlementDate) || new Date();

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { partners: true }
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    if (totalAmountPKR <= 0) {
      return res.status(400).json({ message: "Total amount must be greater than 0" });
    }

    const { dispatcherAmountPKR, accountsAmountPKR, partnerProfitPKR, partnerSplits } =
      calculateSettlementAmounts(totalAmountPKR, dispatcherValue, dispatcherType, accountsValue, accountsType, branch.partners);

    if (accountsType === "ABSOLUTE") {
      if (dispatcherAmountPKR + accountsAmountPKR > totalAmountPKR + 1) {
        return res.status(400).json({
          message: "Dispatcher + Accounts amounts cannot exceed total amount received"
        });
      }
    }

    const settlement = await prisma.invoiceSettlement.create({
      data: {
        branchId,
        invoiceId: null,
        invoiceNumber: null,
        companyName,

        totalAmountPKR,
        invoiceAmountUSD,
        usdRate,
        amountType: "MIXED",

        dispatcherValue,
        dispatcherAmountPKR,

        accountsValue,
        accountsAmountPKR,

        partnerProfitPKR,
        partnerSplits,

        clearedBy: req.user?.name || req.user?.email || "Admin",
        settlementDate,
        notes: req.body.notes || null
      }
    });

    res.status(201).json({
      message: "Manual settlement created successfully",
      settlement
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getSettlements = async (req, res) => {
  try {
    const { branchId } = req.query;

    const where = {};
    if (branchId) where.branchId = Number(branchId);

    const settlements = await prisma.invoiceSettlement.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json(settlements);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Settlement ID is required" });
    }

    const settlement = await prisma.invoiceSettlement.findUnique({
      where: { id: Number(id) }
    });

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (settlement.invoiceId) {
      await prisma.invoice.update({
        where: { id: settlement.invoiceId },
        data: { isCleared: false, clearedAt: null }
      });
    }

    await prisma.invoiceSettlement.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({
      message: "Settlement deleted successfully",
      id: Number(id)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  clearInvoice,
  createManualSettlement,
  getSettlements,
  deleteSettlement
};