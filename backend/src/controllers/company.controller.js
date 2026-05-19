const prisma = require("../utils/prisma");

const createCompany = async (req, res) => {
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

    const company = await prisma.company.create({
      data: {
        branchId: Number(branchId),
        companyName: req.body.companyName,
        ownerName: req.body.ownerName || null,
        mcNumber: req.body.mcNumber || null,
        dotNumber: req.body.dotNumber || null,
        address: req.body.address || null,
        contactNumber: req.body.contactNumber || null,
        email: req.body.email || null,
        billingType: req.body.billingType || "PERCENTAGE",
        dispatchPercent: Number(req.body.dispatchPercent || 0),
        fixedMonthlyRate: Number(req.body.fixedMonthlyRate || 0),
        accountNumber: req.body.accountNumber || null,
        accountTitle: req.body.accountTitle || null,
        notes: req.body.notes || null
      }
    });

    res.status(201).json({
      message: "Company created successfully",
      company
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCompanies = async (req, res) => {
  try {
    const { branchId } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        branch: true,
        trucks: true,
        drivers: {
          include: {
            truck: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(companies);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: Number(id) },
      include: {
        branch: true,
        trucks: true,
        drivers: {
          include: {
            truck: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: {
        branchId: req.body.branchId ? Number(req.body.branchId) : undefined,
        companyName: req.body.companyName,
        ownerName: req.body.ownerName,
        mcNumber: req.body.mcNumber,
        dotNumber: req.body.dotNumber,
        address: req.body.address,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        billingType: req.body.billingType,
        dispatchPercent:
          req.body.dispatchPercent !== undefined
            ? Number(req.body.dispatchPercent)
            : undefined,
        fixedMonthlyRate:
          req.body.fixedMonthlyRate !== undefined
            ? Number(req.body.fixedMonthlyRate)
            : undefined,
        accountNumber: req.body.accountNumber,
        accountTitle: req.body.accountTitle,
        notes: req.body.notes
      }
    });

    res.json({
      message: "Company updated successfully",
      company
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.company.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany
};