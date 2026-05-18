const prisma = require("../utils/prisma");

const createDriver = async (req, res) => {
  try {
    const driver = await prisma.driver.create({
      data: {
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        companyId: req.body.companyId ? Number(req.body.companyId) : null,
        truckId: req.body.truckId ? Number(req.body.truckId) : null
      },
      include: {
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
    const { companyId, truckId } = req.query;

    const where = {};

    if (companyId) {
      where.companyId = Number(companyId);
    }

    if (truckId) {
      where.truckId = Number(truckId);
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
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
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        companyId: req.body.companyId ? Number(req.body.companyId) : null,
        truckId: req.body.truckId ? Number(req.body.truckId) : null
      },
      include: {
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