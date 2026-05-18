const prisma = require("../utils/prisma");

const createEmployee = async (req, res) => {
  try {
    const employee = await prisma.employee.create({
      data: req.body
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
    const employees = await prisma.employee.findMany({
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
      data: req.body
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