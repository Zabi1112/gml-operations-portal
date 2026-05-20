const prisma = require("../utils/prisma");

const createLoad = async (req, res) => {
  try {
    const { branchId, companyId, truckId, driverId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const miles = Number(req.body.miles || 0);
    const ratePerMile = Number(req.body.ratePerMile || 0);
    const grossAmount = Number(req.body.grossAmount || miles * ratePerMile || 0);

    const load = await prisma.load.create({
      data: {
        branchId: Number(branchId),
        companyId: companyId ? Number(companyId) : null,
        truckId: truckId ? Number(truckId) : null,
        driverId: driverId ? Number(driverId) : null,

        companyName: req.body.companyName || null,
        truckNumber: req.body.truckNumber || null,
        driverName: req.body.driverName || null,
        driverType: req.body.driverType || null,
        bookedByTeam: req.body.bookedByTeam || null,

        loadDate: new Date(req.body.loadDate),
        pickupDate: req.body.pickupDate ? new Date(req.body.pickupDate) : null,
        dropoffDate: req.body.dropoffDate ? new Date(req.body.dropoffDate) : null,

        pickup: req.body.pickup,
        dropoff: req.body.dropoff,

        miles,
        ratePerMile,
        grossAmount,

        loadAmount: Number(req.body.loadAmount || grossAmount || 0),
        dispatchPercent: Number(req.body.dispatchPercent || 0),
        dispatchAmount: Number(req.body.dispatchAmount || 0),

        source: req.body.source || "MANUAL"
      }
    });

    res.status(201).json({
      message: "Load created successfully",
      load
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const getLoads = async (req, res) => {
  try {
    const {
      branchId,
      companyId,
      truckId,
      driverId,
      from,
      to,
      bookedByTeam,
      source
    } = req.query;

    const where = {};

    if (branchId) where.branchId = Number(branchId);
    if (companyId) where.companyId = Number(companyId);
    if (truckId) where.truckId = Number(truckId);
    if (driverId) where.driverId = Number(driverId);
    if (bookedByTeam) where.bookedByTeam = bookedByTeam;
    if (source) where.source = source;

    if (from || to) {
      where.loadDate = {};
      if (from) where.loadDate.gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        where.loadDate.lte = endDate;
      }
    }

    const loads = await prisma.load.findMany({
      where,
      orderBy: { loadDate: "asc" }
    });

    res.json(loads);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateLoad = async (req, res) => {
  try {
    const { id } = req.params;

    const miles = Number(req.body.miles || 0);
    const ratePerMile = Number(req.body.ratePerMile || 0);
    const grossAmount = Number(req.body.grossAmount || miles * ratePerMile || 0);

    const load = await prisma.load.update({
      where: { id: Number(id) },
      data: {
        pickupDate: req.body.pickupDate ? new Date(req.body.pickupDate) : null,
        dropoffDate: req.body.dropoffDate ? new Date(req.body.dropoffDate) : null,
        pickup: req.body.pickup,
        dropoff: req.body.dropoff,
        miles,
        ratePerMile,
        grossAmount,
        loadAmount: grossAmount,
        driverName: req.body.driverName,
        driverType: req.body.driverType,
        bookedByTeam: req.body.bookedByTeam
      }
    });

    res.json({
      message: "Load updated successfully",
      load
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteLoad = async (req, res) => {
  try {
    await prisma.load.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Load deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const createLoadReason = async (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const reason = await prisma.loadReportReason.create({
      data: {
        branchId: Number(branchId),
        companyId: req.body.companyId ? Number(req.body.companyId) : null,
        truckId: req.body.truckId ? Number(req.body.truckId) : null,

        companyName: req.body.companyName || null,
        truckNumber: req.body.truckNumber || null,

        reasonDate: new Date(req.body.reasonDate),
        reasonType: req.body.reasonType,
        reasonNote: req.body.reasonNote || null
      }
    });

    res.status(201).json({
      message: "Reason saved successfully",
      reason
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const getLoadReasons = async (req, res) => {
  try {
    const { branchId, companyId, truckId, from, to } = req.query;

    const where = {};

    if (branchId) where.branchId = Number(branchId);
    if (companyId) where.companyId = Number(companyId);
    if (truckId) where.truckId = Number(truckId);

    if (from || to) {
      where.reasonDate = {};
      if (from) where.reasonDate.gte = new Date(from);
      if (to) where.reasonDate.lte = new Date(to);
    }

    const reasons = await prisma.loadReportReason.findMany({
      where,
      orderBy: { reasonDate: "asc" }
    });

    res.json(reasons);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteLoadReason = async (req, res) => {
  try {
    await prisma.loadReportReason.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Reason deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createLoad,
  getLoads,
  updateLoad,
  deleteLoad,
  createLoadReason,
  getLoadReasons,
  deleteLoadReason
};