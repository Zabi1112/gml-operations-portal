const prisma = require("../utils/prisma");

const createCompany = async (req, res) => {
  try {
    const company = await prisma.company.create({
      data: {
        ...req.body,
        dispatchPercent: Number(req.body.dispatchPercent || 0),
        fixedMonthlyRate: Number(req.body.fixedMonthlyRate || 0)
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
    const companies = await prisma.company.findMany({
      include: {
        trucks: true,
        drivers: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(companies);
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
        ...req.body,
        dispatchPercent:
          req.body.dispatchPercent !== undefined
            ? Number(req.body.dispatchPercent)
            : undefined,
        fixedMonthlyRate:
          req.body.fixedMonthlyRate !== undefined
            ? Number(req.body.fixedMonthlyRate)
            : undefined
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
  updateCompany,
  deleteCompany
};