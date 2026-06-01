const prisma = require("../utils/prisma");

const createLoadReport = async (req, res) => {
  try {
    const { branchId, companyId, truckId } = req.body;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const report = await prisma.loadReport.create({
      data: {
        branchId: Number(branchId),
        companyId: companyId ? Number(companyId) : null,
        truckId: truckId ? Number(truckId) : null,

        companyName: req.body.companyName || null,
        ownerName: req.body.ownerName || null,
        mcNumber: req.body.mcNumber || null,
        dotNumber: req.body.dotNumber || null,
        truckNumber: req.body.truckNumber || null,
        trailerNumber: req.body.trailerNumber || null,

        reportTitle:
          req.body.title || req.body.reportTitle || "Driver Load Report",

        periodStart: new Date(req.body.from || req.body.periodStart),
        periodEnd: new Date(req.body.to || req.body.periodEnd),

        totalLoads: Number(req.body.totalLoads || 0),
        totalMiles: Number(req.body.totalMiles || 0),
        totalGross: Number(req.body.totalGross || 0),
        avgRatePerMile: Number(req.body.avgRatePerMile || 0),
        reasonDays: Number(req.body.reasonDays || 0),

        reportData: req.body
      }
    });

    res.status(201).json({
      message: "Load report saved successfully",
      report
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getLoadReports = async (req, res) => {
  try {
    const { branchId, companyId, truckId, from, to } = req.query;

    const where = {};

    if (branchId) where.branchId = Number(branchId);
    if (companyId) where.companyId = Number(companyId);
    if (truckId) where.truckId = Number(truckId);

    if (from || to) {
      where.periodStart = {};
      if (from) where.periodStart.gte = new Date(from);
      if (to) where.periodStart.lte = new Date(to);
    }

    const reports = await prisma.loadReport.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    res.json(reports);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteLoadReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Load report ID is required" });
    }

    const report = await prisma.loadReport.findUnique({
      where: { id: Number(id) }
    });

    if (!report) {
      return res.status(404).json({ message: "Load report not found" });
    }

    await prisma.loadReport.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({
      message: "Load report deleted successfully",
      id: Number(id)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createLoadReport,
  getLoadReports,
  deleteLoadReport
};