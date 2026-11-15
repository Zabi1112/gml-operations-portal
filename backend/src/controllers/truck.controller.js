const {fleetUpdate}=require("../utils/fleetUpdates");
const prisma = require("../utils/prisma");

const createTruck = async (req, res) => {
  try {
    const { branchId, companyId } = req.body;

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

    const truck = await prisma.truck.create({
      data: {
        branchId: Number(branchId),
        companyId: Number(companyId),
        truckNumber: req.body.truckNumber,
        trailerNumber: req.body.trailerNumber || null,
        notes: req.body.notes || null
      },
      include: {
        branch: true,
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
    const { branchId, companyId } = req.query;

    const where = {};

    if (branchId) {
      where.branchId = Number(branchId);
    }

    if (companyId) {
      where.companyId = Number(companyId);
    }

    const trucks = await prisma.truck.findMany({
      where,
      include: {
        branch: true,
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

const updateTruck = async (req,res) => {
 try{
  const record=await prisma.$transaction(async tx=>{
   const current=await tx.truck.findUnique({where:{id:Number(req.params.id)}});
   const data=await fleetUpdate(tx,'truck',current,req.body);
   return tx.truck.update({where:{id:current.id},data,include:{branch:true,company:true,drivers:true}});
  });
  res.json({message:'Updated successfully',truck:record});
 }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Unable to update truck'});}
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