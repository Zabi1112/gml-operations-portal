const prisma = require("../utils/prisma");

const createEmployee = async (req, res) => {
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

    const employee = await prisma.employee.create({
      data: {
        branchId: Number(branchId),
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        cnic: req.body.cnic || null,
        role: req.body.role || "Staff",
        salaryType: req.body.salaryType || "FIXED",
        fixedSalary: Number(req.body.fixedSalary || 0),
        commission: Number(req.body.commission || 0),
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
      }
    });

    res.status(201).json({
      message: "Employee created successfully",
      employee
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployees = async (req, res) => {
  try {
    const { branchId } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        branch: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(employees);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        branchId: req.body.branchId ? Number(req.body.branchId) : undefined,
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        cnic: req.body.cnic,
        role: req.body.role,
        salaryType: req.body.salaryType,
        fixedSalary:
          req.body.fixedSalary !== undefined
            ? Number(req.body.fixedSalary)
            : undefined,
        commission:
          req.body.commission !== undefined
            ? Number(req.body.commission)
            : undefined,
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined
      }
    });

    res.json({
      message: "Employee updated successfully",
      employee
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id: Number(id) }
    });

    res.json({
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee
};