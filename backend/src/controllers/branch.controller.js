const prisma = require("../utils/prisma");

const createBranch = async (req, res) => {
  try {
    const branch = await prisma.branch.create({
      data: {
        branchName: req.body.branchName,
        location: req.body.location || null,
        phone: req.body.phone || null,
        email: req.body.email || null,
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
      }
    });

    res.status(201).json({
      message: "Branch created successfully",
      branch
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json(branches);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: Number(id) },
      include: {
        employees: true,
        companies: true,
        trucks: true,
        drivers: true
      }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json(branch);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.update({
      where: { id: Number(id) },
      data: {
        branchName: req.body.branchName,
        location: req.body.location,
        phone: req.body.phone,
        email: req.body.email,
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined
      }
    });

    res.json({
      message: "Branch updated successfully",
      branch
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: Number(id) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    await prisma.branch.delete({
      where: { id: Number(id) }
    });

    res.json({
      message: "Branch and all related data deleted successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch
};