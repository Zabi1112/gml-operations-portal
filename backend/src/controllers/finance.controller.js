const prisma = require("../utils/prisma");

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
    const invoiceAmountPKR = invoiceAmountUSD * usdRate;

    const dispatcherPercent = Number(
      req.body.dispatcherPercent ?? branch.dispatcherPercent ?? 25
    );

    const accountsPercent = Number(
      req.body.accountsPercent ?? branch.accountsPercent ?? 10
    );

    const dispatcherAmountPKR = (invoiceAmountPKR * dispatcherPercent) / 100;
    const accountsAmountPKR = (invoiceAmountPKR * accountsPercent) / 100;

    const partnerProfitPKR =
      invoiceAmountPKR - dispatcherAmountPKR - accountsAmountPKR;

    const partnerSplits = branch.partners.map((partner) => ({
      partnerId: partner.id,
      name: partner.name,
      percent: Number(partner.percent || 0),
      amountPKR: (partnerProfitPKR * Number(partner.percent || 0)) / 100
    }));

    const settlement = await prisma.invoiceSettlement.create({
      data: {
        branchId: invoice.branchId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyName: invoice.companyName,

        invoiceAmountUSD,
        usdRate,
        invoiceAmountPKR,

        dispatcherPercent,
        dispatcherAmountPKR,

        accountsPercent,
        accountsAmountPKR,

        partnerProfitPKR,
        partnerSplits,

        clearedBy: req.user?.name || req.user?.email || "Admin",
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

module.exports = {
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  clearInvoice,
  getSettlements
};