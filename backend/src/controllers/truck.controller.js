const prisma = require("../utils/prisma");

const createTruck = async (req, res) => {
  try {
    const truck = await prisma.truck.create({
      data: {
        companyId: Number(req.body.companyId),
        truckNumber: req.body.truckNumber,
        trailerNumber: req.body.trailerNumber || null,
        notes: req.body.notes || null
      },
      include: {
        company: true,
        drivers: true
      }
    });

    res.status(201).json({
      message: "Truck created successfully",
      truck
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTrucks = async (req, res) => {
  try {
    const { companyId } = req.query;

    const where = {};

    if (companyId) {
      where.companyId = Number(companyId);
    }

    const trucks = await prisma.truck.findMany({
      where,
      include: {
        company: true,
        drivers: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(trucks);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTruck = async (req, res) => {
  try {
    const { id } = req.params;

    const truck = await prisma.truck.update({
      where: { id: Number(id) },
      data: {
        companyId: req.body.companyId ? Number(req.body.companyId) : undefined,
        truckNumber: req.body.truckNumber,
        trailerNumber: req.body.trailerNumber || null,
        notes: req.body.notes || null
      },
      include: {
        company: true,
        drivers: true
      }
    });

    res.json({
      message: "Truck updated successfully",
      truck
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteTruck = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.truck.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Truck deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createTruck,
  getTrucks,
  updateTruck,
  deleteTruck
};