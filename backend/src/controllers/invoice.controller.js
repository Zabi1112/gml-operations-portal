const {validateInvoice,validateLoadOwners}=require('../utils/invoiceValidation');
const payments=require("../utils/invoicePayments");
const prisma = require("../utils/prisma");
const { createLoadsSafely } = require("../utils/loadDedup");

const generateInvoiceNumber = async (branchId, db = prisma) => {
  const branch=await db.branch.findUnique({where:{id:Number(branchId)}});
  const rows=await db.invoice.findMany({where:{branchId:Number(branchId)},select:{invoiceNumber:true}});
  const highest=rows.reduce((max,i)=>{const m=/^INV-(\d+)$/.exec(i.invoiceNumber||'');return m?Math.max(max,Number(m[1])):max;},branch.invoiceSequence||0);
  if(!Number.isSafeInteger(highest)||highest>=2147483646)payments.fail(400,'Invoice number sequence is too large.');
  const nextNumber=highest+1;
  await db.branch.update({where:{id:Number(branchId)},data:{invoiceSequence:nextNumber}});
  return 'INV-'+String(nextNumber).padStart(5,'0');
};

const calculateInvoice = (data, fixedFallback = null) => {
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
      driverId: Number.isSafeInteger(Number(load.driverId)) && Number(load.driverId) > 0 ? Number(load.driverId) : null,
      driverName: typeof load.driverName === "string" ? load.driverName.trim().slice(0, 200) || null : null,
      truckId: Number.isSafeInteger(Number(load.truckId)) && Number(load.truckId) > 0 ? Number(load.truckId) : null,
      truckNumber: typeof load.truckNumber === "string" ? load.truckNumber.trim().slice(0, 100) || null : null,
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
        : data.selectedTruckCount === undefined && fixedFallback !== null ? fixedFallback : fixedMonthlyRate * selectedTruckCount
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
    netPayable: Math.round(netPayable*100)/100
  };
};

const createInvoice = async (req, res) => {
  try {
    const { branchId } = req.body;
    validateInvoice(req.body);
    const requestId=req.body.createRequestId;
    if(requestId!==undefined&&(typeof requestId!=="string"||! /^[a-f0-9-]{36}$/i.test(requestId)))payments.fail(400,"Invalid save request. Refresh the invoice preview.");

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const invoice = await prisma.$transaction(async tx => {
    await payments.lockCompany(tx,branchId,0);
    await payments.lockCompany(tx,branchId,req.body.companyId);
    if(requestId){const prior=await tx.invoice.findUnique({where:{createRequestId:requestId},include:{loads:true}});if(prior){if(prior.branchId!==Number(branchId)||prior.companyId!==(req.body.companyId?Number(req.body.companyId):null))payments.fail(409,"Save request already used for another invoice.");return prior;}}
    if(req.body.companyId && !await tx.company.findFirst({where:{id:Number(req.body.companyId),branchId:Number(branchId)}}))payments.fail(400,"Company does not belong to this branch.");
    await validateLoadOwners(tx,req.body);
    const previous = req.body.companyId ? await payments.outstanding(tx,branchId,req.body.companyId) : {items:[],totalUSD:0};
    if(req.body.companyId && Math.abs(Number(req.body.previousInvoiceAmount||0)-previous.totalUSD)>.005) payments.fail(409,'The company balance changed. Re-fetch the pending balance before saving this invoice.');
    const calculated = calculateInvoice({...req.body,previousInvoiceAmount:previous.totalUSD,includePreviousInvoiceInNet:true});
    const currentChargesUSD=(payments.cents(calculated.netPayable)-payments.cents(previous.totalUSD))/100;
    if(currentChargesUSD<0)payments.fail(400,'Discounts and deductions cannot exceed the new invoice charges.');

    const invoiceNumber =
      req.body.invoiceNumber?.trim() || (await generateInvoiceNumber(branchId,tx));

    if(req.body.invoiceNumber && await tx.invoice.findFirst({where:{branchId:Number(branchId),companyId:req.body.companyId?Number(req.body.companyId):null,invoiceNumber:req.body.invoiceNumber.trim()}}))payments.fail(409,"This company already has that invoice number. Choose a new number.");
    return tx.invoice.create({
      data: {
        createRequestId:requestId||null,
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

        previousInvoiceAmount: previous.totalUSD,
        includePreviousInvoiceInNet: previous.totalUSD > 0,
        currentChargesUSD,
        carryForward: previous.items,

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

    },{timeout:30000});

    // Save manual loads that don't already exist (smart deduplication)
    const loadSaveResults = await createLoadsSafely(
      invoice.loads.map((load) => ({
        branchId: Number(branchId),
        companyId: req.body.companyId ? Number(req.body.companyId) : null,
        truckId: load.truckId || (req.body.selectedTruckIds?.length === 1 ? Number(req.body.selectedTruckIds[0]) : null),
        driverId: load.driverId,

        companyName: invoice.companyName,
        truckNumber: load.truckNumber,
        driverName: load.driverName,

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
    ).catch(()=>({created:[],duplicates:[],errors:[{message:'Invoice saved, but copying loads to the load register failed.'}]}));

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
    res.status(error.status || 500).json({
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

    res.json(await payments.decorate(prisma,invoices));
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({
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

    res.json(await payments.decorate(prisma,invoices));
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({
      message: error.message || "Server error"
    });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    let existing = await prisma.invoice.findUnique({
      where: { id: Number(id) },include:{loads:true}
    });

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const invoice = await prisma.$transaction(async (tx) => {
    await payments.lockCompany(tx,existing.branchId,0);
    await payments.lockCompany(tx,existing.branchId,existing.companyId);
    const fresh=await tx.invoice.findUnique({where:{id:Number(id)},include:{loads:true}});
    if(!fresh)payments.fail(404,"Invoice not found");
    await payments.assertEditable(tx,fresh);
    existing=fresh;
    const input={...existing,...req.body,branchId:existing.branchId,companyId:existing.companyId,previousInvoiceAmount:existing.previousInvoiceAmount,includePreviousInvoiceInNet:existing.includePreviousInvoiceInNet};
    validateInvoice(input);
    await validateLoadOwners(tx,input);
    if(input.billingType==='FIXED'&&!input.truckRateBreakdown?.length&&input.selectedTruckCount===undefined&&(existing.billingType!=='FIXED'||Number(input.fixedMonthlyRate)!==existing.fixedMonthlyRate))payments.fail(400,'Provide truck rates or a truck count when changing fixed billing.');
    if(req.body.invoiceNumber && req.body.invoiceNumber.trim()!==existing.invoiceNumber && await tx.invoice.findFirst({where:{branchId:existing.branchId,companyId:existing.companyId,invoiceNumber:req.body.invoiceNumber.trim(),id:{not:existing.id}}}))payments.fail(409,'This company already has that invoice number.');
    const calculated = calculateInvoice(input,existing.billingType==='FIXED'?existing.fixedBillingAmount:null);

    if(calculated.netPayable-(existing.includePreviousInvoiceInNet?existing.previousInvoiceAmount:0)<0)payments.fail(400,"Deductions cannot exceed new charges.");
      await tx.invoiceLoad.deleteMany({ where: { invoiceId: Number(id) } });

      return tx.invoice.update({
        where: { id: Number(id) },
        data: {
          companyName: req.body.companyName ?? existing.companyName,
          ownerName: req.body.ownerName ?? existing.ownerName,
          mcNumber: req.body.mcNumber ?? existing.mcNumber,
          dotNumber: req.body.dotNumber ?? existing.dotNumber,
          address: req.body.address ?? existing.address,
          contactNumber: req.body.contactNumber ?? existing.contactNumber,
          email: req.body.email ?? existing.email,

          billingType: req.body.billingType || existing.billingType,
          dispatchPercent: Number(req.body.dispatchPercent ?? existing.dispatchPercent),
          fixedMonthlyRate: Number(req.body.fixedMonthlyRate ?? existing.fixedMonthlyRate),

          truckNumbers: req.body.truckNumbers ?? existing.truckNumbers,
          driverNames: req.body.driverNames ?? existing.driverNames,

          invoiceNumber: req.body.invoiceNumber?.trim() || existing.invoiceNumber,
          invoiceStart: req.body.invoiceStart
            ? new Date(req.body.invoiceStart)
            : existing.invoiceStart,
          invoiceEnd: req.body.invoiceEnd
            ? new Date(req.body.invoiceEnd)
            : existing.invoiceEnd,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : existing.dueDate,

          accountNumber: req.body.accountNumber ?? existing.accountNumber,
          accountTitle: req.body.accountTitle ?? existing.accountTitle,

          accountsFeeWeeks: Number(req.body.accountsFeeWeeks ?? existing.accountsFeeWeeks),
          accountsFeeRate: Number(req.body.accountsFeeRate ?? existing.accountsFeeRate),
          accountsFeeTotal: calculated.accountsFeeTotal,

          totalLoadAmount: calculated.totalLoadAmount,
          totalDispatchAmount: calculated.totalDispatchAmount,
          fixedBillingAmount: calculated.fixedBillingAmount,
          truckRateBreakdown: calculated.truckRateBreakdown,
          grossAmount: calculated.grossAmount,

          discountAmount: Number(req.body.discountAmount ?? existing.discountAmount),
          referralBonus: Number(req.body.referralBonus ?? existing.referralBonus),
          fineAmount: Number(req.body.fineAmount ?? existing.fineAmount),
          fineReason: req.body.fineReason ?? existing.fineReason,

          previousInvoiceAmount: existing.previousInvoiceAmount,
          includePreviousInvoiceInNet: existing.includePreviousInvoiceInNet,

          netPayable: calculated.netPayable,
          ...(existing.currentChargesUSD !== null ? {currentChargesUSD:(payments.cents(calculated.netPayable)-payments.cents(existing.previousInvoiceAmount))/100} : {}),
          paidAmountUSD: 0,
          isCleared: false,
          clearedAt: null,
          notes: req.body.notes ?? existing.notes,

          loads: {
            create: calculated.calculatedLoads
          }
        },
        include: {
          loads: true
        }
      });
    });

    res.json({
      message: "Invoice updated successfully",
      invoice
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({
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

    await prisma.$transaction(async tx=>{
      await payments.lockCompany(tx,invoice.branchId,invoice.companyId);
      const fresh=await tx.invoice.findUnique({where:{id:Number(id)}});
      if(!fresh)payments.fail(404,'Invoice not found');
      await payments.assertMutable(tx,fresh);
      await tx.invoiceLoad.deleteMany({where:{invoiceId:Number(id)}});
      await tx.invoice.delete({where:{id:Number(id)}});
    },{timeout:30000});

    res.status(200).json({
      message: "Invoice deleted successfully",
      id: Number(id)
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

const getOutstanding = async (req,res) => {try {const branchId=Number(req.query.branchId),companyId=Number(req.query.companyId);if(!Number.isSafeInteger(branchId)||branchId<1||!Number.isSafeInteger(companyId)||companyId<1)return res.status(400).json({message:'Choose a branch and company.'});res.json(await payments.outstanding(prisma,branchId,companyId));}catch(error){res.status(error.status||500).json({message:error.status?error.message:'Unable to load pending balance.'});}};
module.exports = {
  getOutstanding,
  calculateInvoice,
  createInvoice,
  getInvoices,
  getInvoicesByBranch,
  updateInvoice,
  deleteInvoice
};