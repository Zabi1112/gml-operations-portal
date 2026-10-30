const payments=require("../utils/invoicePayments");
const {
  allocatePartnerAmounts,
  defaultAccountsPartnerId
} = require("../utils/settlementAllocation");
const prisma = require("../utils/prisma");

const resolveAccountsPartnerId = (partners, requestedId, accountsValue) => {
  if (requestedId !== null && requestedId !== undefined && requestedId !== "") {
    return Number(requestedId);
  }
  return Number(accountsValue) > 0 ? defaultAccountsPartnerId(partners) : null;
};

const calculateSettlementAmounts = (
  totalAmountPKR,
  dispatcherValue,
  dispatcherType,
  accountsValue,
  accountsType,
  partners,
  dispatcherSplitsInput = [],
  dispatchers = [],
  accountsPartnerId = null
) => {
  const dispatcherAmountPKR =
    dispatcherType === "ABSOLUTE"
      ? Number(dispatcherValue || 0)
      : (totalAmountPKR * Number(dispatcherValue || 0)) / 100;

  let accountsAmountPKR = 0;
  if (accountsType === "ABSOLUTE") {
    accountsAmountPKR = Number(accountsValue || 0);
  } else {
    accountsAmountPKR = (totalAmountPKR * Number(accountsValue || 0)) / 100;
  }

  const {partnerProfitPKR,partnerSplits}=allocatePartnerAmounts(totalAmountPKR,dispatcherAmountPKR,accountsAmountPKR,partners,accountsPartnerId);

  const cleanedDispatcherSplits = (dispatcherSplitsInput || [])
    .filter((split) => split.dispatcherId && Number(split.amount ?? split.amountPKR) > 0)
    .map((split) => {
      const dispatcher = dispatchers.find((d) => d.id === Number(split.dispatcherId));
      return {
        dispatcherId: Number(split.dispatcherId),
        name: dispatcher?.name || split.name || "Dispatcher",
        amountPKR: Number(split.amount ?? split.amountPKR ?? 0)
      };
    });

  const dispatcherSplitsTotal = cleanedDispatcherSplits.reduce(
    (sum, split) => sum + split.amountPKR,
    0
  );

  if (dispatcherSplitsTotal > dispatcherAmountPKR + 1) {
    throw new Error(
      "Dispatcher split amounts cannot exceed the total amount given to dispatchers"
    );
  }

  return {
    dispatcherAmountPKR,
    accountsAmountPKR,
    partnerProfitPKR,
    partnerSplits,
    dispatcherSplits: cleanedDispatcherSplits
  };
};

const getFinanceSettings = async (req, res) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: Number(req.params.branchId) },
      include: { partners: true, dispatchers: true }
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
        dispatcherPercent: Number(req.body.dispatcherPercent ?? 25),
        accountsPercent: Number(req.body.accountsPercent ?? 10)
      },
      include: { partners: true, dispatchers: true }
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

const createDispatcher = async (req, res) => {
  try {
    const dispatcher = await prisma.branchDispatcher.create({
      data: {
        branchId: Number(req.body.branchId),
        name: req.body.name,
        phone: req.body.phone || null,
        notes: req.body.notes || null
      }
    });

    res.status(201).json({ message: "Dispatcher created", dispatcher });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteDispatcher = async (req, res) => {
  try {
    await prisma.branchDispatcher.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Dispatcher deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const clearInvoice = async (req, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId);

    const result=await prisma.$transaction(async tx=>{
    const initial=await tx.invoice.findUnique({where:{id:invoiceId}});
    if(!initial)payments.fail(404,"Invoice not found");
    await payments.lockCompany(tx,initial.branchId,initial.companyId);
    const requestId=req.body.paymentRequestId;
    if(typeof requestId!=="string"||! /^[a-f0-9-]{36}$/i.test(requestId))payments.fail(400,"Payment request ID is required. Refresh and try again.");
    const prior=await tx.invoiceSettlement.findUnique({where:{paymentRequestId:requestId}});
    if(prior){if(prior.invoiceId!==invoiceId)payments.fail(409,"Payment request already used.");return prior;}
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) payments.fail(404,"Invoice not found");
    if (invoice.isCleared) {
      payments.fail(400,"Invoice already paid");
    }

    const branch = await tx.branch.findUnique({
      where: { id: invoice.branchId },
      include: { partners: true, dispatchers: true }
    });

    if (!branch)payments.fail(404,"Branch not found");

    const invoiceAmountUSD = Number(req.body.amountReceivedUSD);
    const paymentAllocations=payments.paymentPlan(invoice,await payments.companyRows(tx,invoice),invoiceAmountUSD);
    const { paymentMethod, settlementDate } = payments.validatePaymentDetails(
      req.body.paymentMethod,
      req.body.otherPaymentMethod,
      req.body.settlementDate
    );
    const usdRate = Number(req.body.usdRate || 0);
    if(!Number.isFinite(usdRate)||usdRate<=0)payments.fail(400,"Enter a valid USD to PKR rate.");
    const totalAmountPKR = payments.cents(invoiceAmountUSD * usdRate)/100;

    const dispatcherType = req.body.dispatcherType || "PERCENTAGE";
    const dispatcherValue = Number(req.body.dispatcherValue ?? branch.dispatcherPercent ?? 25);
    const dispatcherSplitsInput = req.body.dispatcherSplits || [];

    const accountsType = req.body.accountsType || "PERCENTAGE";
    const accountsValue = Number(req.body.accountsValue ?? branch.accountsPercent ?? 10);

    const accountsPartnerId = resolveAccountsPartnerId(
      branch.partners,
      req.body.accountsPartnerId,
      accountsValue
    );
    if (accountsValue > 0 && accountsPartnerId === null) {
      payments.fail(400,"Select the partner who will pay the accounts fee.");
    }
    let calc;
    try {
      calc = calculateSettlementAmounts(
        totalAmountPKR,
        dispatcherValue,
        dispatcherType,
        accountsValue,
        accountsType,
        branch.partners,
        dispatcherSplitsInput,
        branch.dispatchers,
        accountsPartnerId
      );
    } catch (err) {
      payments.fail(400,err.message);
    }
    const { dispatcherAmountPKR, accountsAmountPKR, partnerProfitPKR, partnerSplits, dispatcherSplits } = calc;

    const settlement = await tx.invoiceSettlement.create({
      data: {
        paymentAllocations,
        paymentRequestId:requestId,
        paymentMethod,
        branchId: invoice.branchId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyName: invoice.companyName,

        totalAmountPKR,
        invoiceAmountUSD,
        usdRate,
        amountType: "MIXED",

        dispatcherType,
        dispatcherValue,
        dispatcherAmountPKR,
        dispatcherSplits,

        accountsType,
        accountsValue,
        accountsAmountPKR,
        accountsPartnerId,

        partnerProfitPKR,
        partnerSplits,

        clearedBy: req.user?.name || req.user?.email || "Admin",
        settlementDate,
        notes: req.body.notes || null
      }
    });

    for(const allocation of paymentAllocations)await tx.invoice.update({where:{id:allocation.invoiceId},data:{paidAmountUSD:{increment:allocation.amountUSD}}});
    await payments.refreshFlags(tx,invoice);
    return settlement;
    },{timeout:30000});

    res.status(201).json({
      message: "Payment recorded successfully",
      settlement:result
    });
  } catch (error) {
    console.log(error);
    res.status(error.status||500).json({ message: error.status?error.message:"Unable to record payment" });
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
    const dispatcherSplitsInput = req.body.dispatcherSplits || [];
    const accountsValue = Number(req.body.accountsValue || 0);
    const accountsType = req.body.accountsType || "PERCENTAGE";
    const companyName = req.body.companyName || "Manual Settlement";
    const settlementDate = new Date(req.body.settlementDate) || new Date();

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { partners: true, dispatchers: true }
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    if (totalAmountPKR <= 0) {
      return res.status(400).json({ message: "Total amount must be greater than 0" });
    }

    const accountsPartnerId = resolveAccountsPartnerId(
      branch.partners,
      req.body.accountsPartnerId,
      accountsValue
    );
    if (accountsValue > 0 && accountsPartnerId === null) {
      return res.status(400).json({
        message: "Select the partner who will pay the accounts fee."
      });
    }
    let calc;
    try {
      calc = calculateSettlementAmounts(
        totalAmountPKR,
        dispatcherValue,
        dispatcherType,
        accountsValue,
        accountsType,
        branch.partners,
        dispatcherSplitsInput,
        branch.dispatchers,
        accountsPartnerId
      );
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
    const { dispatcherAmountPKR, accountsAmountPKR, partnerProfitPKR, partnerSplits, dispatcherSplits } = calc;

    if (dispatcherAmountPKR + accountsAmountPKR > totalAmountPKR + 1) {
      return res.status(400).json({
        message: "Dispatcher + Accounts amounts cannot exceed total amount received"
      });
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

        dispatcherType,
        dispatcherValue,
        dispatcherAmountPKR,
        dispatcherSplits,

        accountsType,
        accountsValue,
        accountsAmountPKR,
        accountsPartnerId,

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

const updateSettlement = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.invoiceSettlement.findUnique({
      where: { id }
    });

    if (!existing) return res.status(404).json({ message: "Settlement not found" });
    if (
      Object.prototype.hasOwnProperty.call(req.body, "paymentMethod") ||
      Object.prototype.hasOwnProperty.call(req.body, "settlementDate")
    ) {
      if (!existing.invoiceId) {
        return res.status(400).json({
          message: "Payment details can only be updated for invoice settlements"
        });
      }
      const { paymentMethod, settlementDate } = payments.validatePaymentDetails(
        req.body.paymentMethod,
        req.body.otherPaymentMethod,
        req.body.settlementDate
      );
      const updatedSettlement = await prisma.invoiceSettlement.update({
        where: { id },
        data: { paymentMethod, settlementDate }
      });
      return res.json({
        message: "Invoice payment details updated successfully",
        settlement: updatedSettlement
      });
    }
    if(existing.paymentAllocations)return res.status(409).json({message:"This settlement records a payment. Delete it to reverse the payment, then record the corrected amount."});

    const branch = await prisma.branch.findUnique({
      where: { id: existing.branchId },
      include: { partners: true, dispatchers: true }
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    const totalAmountPKR = Number(req.body.totalAmountPKR ?? existing.totalAmountPKR);
    const invoiceAmountUSD = Number(req.body.invoiceAmountUSD ?? existing.invoiceAmountUSD);
    const usdRate = Number(req.body.usdRate ?? existing.usdRate);

    const dispatcherType = req.body.dispatcherType || existing.dispatcherType || "PERCENTAGE";
    const dispatcherValue = Number(req.body.dispatcherValue ?? existing.dispatcherValue);
    const dispatcherSplitsInput = req.body.dispatcherSplits ?? existing.dispatcherSplits ?? [];

    const accountsType = req.body.accountsType || existing.accountsType || "PERCENTAGE";
    const accountsValue = Number(req.body.accountsValue ?? existing.accountsValue);

    if (totalAmountPKR <= 0) {
      return res.status(400).json({ message: "Total amount must be greater than 0" });
    }

    const requestedAccountsPartnerId =
      req.body.accountsPartnerId === undefined
        ? existing.accountsPartnerId
        : req.body.accountsPartnerId;
    const accountsPartnerId = resolveAccountsPartnerId(
      branch.partners,
      requestedAccountsPartnerId,
      accountsValue
    );
    let calc;
    try {
      calc = calculateSettlementAmounts(
        totalAmountPKR,
        dispatcherValue,
        dispatcherType,
        accountsValue,
        accountsType,
        branch.partners,
        dispatcherSplitsInput,
        branch.dispatchers,
        accountsPartnerId
      );
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
    const { dispatcherAmountPKR, accountsAmountPKR, partnerProfitPKR, partnerSplits, dispatcherSplits } = calc;

    if (dispatcherAmountPKR + accountsAmountPKR > totalAmountPKR + 1) {
      return res.status(400).json({
        message: "Dispatcher + Accounts amounts cannot exceed total amount received"
      });
    }

    const settlement = await prisma.invoiceSettlement.update({
      where: { id },
      data: {
        companyName: req.body.companyName ?? existing.companyName,

        totalAmountPKR,
        invoiceAmountUSD,
        usdRate,

        dispatcherType,
        dispatcherValue,
        dispatcherAmountPKR,
        dispatcherSplits,

        accountsType,
        accountsValue,
        accountsAmountPKR,
        accountsPartnerId,

        partnerProfitPKR,
        partnerSplits,

        settlementDate: req.body.settlementDate
          ? new Date(req.body.settlementDate)
          : existing.settlementDate,
        notes: req.body.notes ?? existing.notes
      }
    });

    res.json({
      message: "Settlement updated successfully",
      settlement
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Server error"
    });
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

    if (settlement.paymentAllocations) {
      await prisma.$transaction(async tx=>{
        const invoice=await tx.invoice.findUnique({where:{id:settlement.invoiceId}});
        if(!invoice)payments.fail(409,'Payment invoice not found.');
        await payments.lockCompany(tx,invoice.branchId,invoice.companyId);
        const current=await tx.invoiceSettlement.findUnique({where:{id:settlement.id}});if(!current)return;
        for(const item of current.paymentAllocations)await tx.invoice.update({where:{id:item.invoiceId},data:{paidAmountUSD:{decrement:item.amountUSD}}});
        await tx.invoiceSettlement.delete({where:{id:current.id}});await payments.refreshFlags(tx,invoice);
      },{timeout:30000});
      return res.json({message:'Payment reversed and balances restored',id:settlement.id});
    }
    await prisma.$transaction(async tx=>{
      if(settlement.invoiceId){
        const invoice=await tx.invoice.findUnique({where:{id:settlement.invoiceId}});
        if(!invoice)payments.fail(409,'Invoice not found');
        await payments.lockCompany(tx,invoice.branchId,invoice.companyId);
        const current=await tx.invoiceSettlement.findUnique({where:{id:settlement.id}});
        if(!current)return;
        if(invoice.currentChargesUSD!==null)payments.fail(409,'This legacy settlement requires balance reconciliation before reversal.');
        await tx.invoice.update({where:{id:invoice.id},data:{paidAmountUSD:0}});
        await tx.invoiceSettlement.delete({where:{id:current.id}});
        await payments.refreshFlags(tx,invoice);
      }else await tx.invoiceSettlement.delete({where:{id:settlement.id}});
    },{timeout:30000});

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
  calculateSettlementAmounts,
  getFinanceSettings,
  updateFinanceSettings,
  createPartner,
  deletePartner,
  createDispatcher,
  deleteDispatcher,
  clearInvoice,
  createManualSettlement,
  getSettlements,
  updateSettlement,
  deleteSettlement
};