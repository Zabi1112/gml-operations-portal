const {fleetUpdate}=require("../utils/fleetUpdates");
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

const updateDriver = async (req,res) => {
 try{
  const record=await prisma.$transaction(async tx=>{
   const current=await tx.driver.findUnique({where:{id:Number(req.params.id)}});
   const data=await fleetUpdate(tx,'driver',current,req.body);
   return tx.driver.update({where:{id:current.id},data,include:{branch:true,company:true,truck:true}});
  });
  res.json({message:'Updated successfully',driver:record});
 }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Unable to update driver'});}
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