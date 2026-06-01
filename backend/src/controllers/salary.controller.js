const prisma = require("../utils/prisma");

const calculateSlip = (data) => {
  const salaryType = data.salaryType;

  const dispatchAmountUSD = Number(data.dispatchAmountUSD || 0);
  const commissionPercent = Number(data.commissionPercent || 0);
  const usdRate = Number(data.usdRate || 0);
  const fixedSalaryPKR = Number(data.fixedSalaryPKR || 0);

  const loanDeduction = Number(data.loanDeduction || 0);
  const advanceDeduction = Number(data.advanceDeduction || 0);
  const otherDeduction = Number(data.otherDeduction || 0);
  const bonus = Number(data.bonus || 0);

  let employeeShareUSD = 0;
  let grossSalaryPKR = 0;

  if (salaryType === "COMMISSION") {
    employeeShareUSD = (dispatchAmountUSD * commissionPercent) / 100;
    grossSalaryPKR = employeeShareUSD * usdRate;
  }

  if (salaryType === "FIXED") {
    grossSalaryPKR = fixedSalaryPKR;
  }

  const netSalaryPKR =
    grossSalaryPKR + bonus - loanDeduction - advanceDeduction - otherDeduction;

  return {
    employeeShareUSD,
    grossSalaryPKR,
    netSalaryPKR
  };
};

const createSalarySlip = async (req, res) => {
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

    const calculated = calculateSlip(req.body);

    const slip = await prisma.salarySlip.create({
      data: {
        branchId: Number(branchId),
        employeeId: Number(req.body.employeeId),
        employeeName: req.body.employeeName || "",
        designation: req.body.designation || null,
        cnic: req.body.cnic || null,

        salaryType: req.body.salaryType || "FIXED",

        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),

        dispatchCompany: req.body.dispatchCompany || null,
        dispatchAmountUSD: Number(req.body.dispatchAmountUSD || 0),
        commissionPercent: Number(req.body.commissionPercent || 0),
        usdRate: Number(req.body.usdRate || 0),
        fixedSalaryPKR: Number(req.body.fixedSalaryPKR || 0),

        loanDeduction: Number(req.body.loanDeduction || 0),
        advanceDeduction: Number(req.body.advanceDeduction || 0),
        otherDeduction: Number(req.body.otherDeduction || 0),
        bonus: Number(req.body.bonus || 0),

        employeeShareUSD: calculated.employeeShareUSD,
        grossSalaryPKR: calculated.grossSalaryPKR,
        netSalaryPKR: calculated.netSalaryPKR,

        notes: req.body.notes || null
      }
    });

    res.status(201).json({
      message: "Salary slip created successfully",
      slip
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getSalarySlips = async (req, res) => {
  try {
    const { branchId, employeeId, from, to } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    if (req.user.role === "VIEWER") {
      if (!req.user.employeeId) {
        return res.json([]);
      }

      where.employeeId = Number(req.user.employeeId);
    } else if (employeeId) {
      where.employeeId = Number(employeeId);
    }

    if (from || to) {
      where.periodStart = {};

      if (from) {
        where.periodStart.gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        where.periodStart.lte = endDate;
      }
    }

    const slips = await prisma.salarySlip.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json(slips);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Salary slip ID is required" });
    }

    const slip = await prisma.salarySlip.findUnique({
      where: { id: Number(id) }
    });

    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    await prisma.salarySlip.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({
      message: "Salary slip deleted successfully",
      id: Number(id)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createSalarySlip,
  getSalarySlips,
  deleteSalarySlip
};