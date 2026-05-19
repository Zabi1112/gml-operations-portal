const prisma = require("../utils/prisma");

const createDriver = async (req, res) => {
  try {
    const { branchId, companyId, truckId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: Number(companyId),
        branchId: Number(branchId)
      }
    });

    if (!company) {
      return res.status(404).json({
        message: "Company not found in this branch"
      });
    }

    if (truckId) {
      const truck = await prisma.truck.findFirst({
        where: {
          id: Number(truckId),
          companyId: Number(companyId),
          branchId: Number(branchId)
        }
      });

      if (!truck) {
        return res.status(404).json({
          message: "Truck not found in this company/branch"
        });
      }
    }

    const driver = await prisma.driver.create({
      data: {
        branchId: Number(branchId),
        companyId: Number(companyId),
        truckId: truckId ? Number(truckId) : null,
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
      },
      include: {
        branch: true,
        company: true,
        truck: true
      }
    });

    res.status(201).json({
      message: "Driver created successfully",
      driver
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDrivers = async (req, res) => {
  try {
    const { branchId, companyId, truckId } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    if (companyId) {
      where.companyId = Number(companyId);
    }

    if (truckId) {
      where.truckId = Number(truckId);
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        branch: true,
        company: true,
        truck: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(drivers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.update({
      where: { id: Number(id) },
      data: {
        branchId: req.body.branchId ? Number(req.body.branchId) : undefined,
        companyId: req.body.companyId ? Number(req.body.companyId) : undefined,
        truckId:
          req.body.truckId !== undefined && req.body.truckId !== ""
            ? Number(req.body.truckId)
            : req.body.truckId === ""
              ? null
              : undefined,
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        isActive:
          req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined
      },
      include: {
        branch: true,
        company: true,
        truck: true
      }
    });

    res.json({
      message: "Driver updated successfully",
      driver
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.driver.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createDriver,
  getDrivers,
  updateDriver,
  deleteDriver
};