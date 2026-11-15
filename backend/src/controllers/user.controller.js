const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, employeeId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "VIEWER",
        employeeId: employeeId ? Number(employeeId) : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: "User created successfully",
      user
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    res.json({
      message: "User status updated",
      user
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: Number(id) }
    });

    res.json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUser = async (req,res) => {
  try {
    const id=Number(req.params.id), {name,email,role}=req.body;
    if(!Number.isSafeInteger(id)||id<1||typeof name!=="string"||!name.trim()||name.length>200||typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||!["ADMIN","MANAGER","EDITOR","VIEWER"].includes(role))
      return res.status(400).json({message:"Enter a valid name, email and role"});
    if(id===req.user.id&&role!=="ADMIN")return res.status(400).json({message:"You cannot remove your own administrator access"});
    const current=await prisma.user.findUnique({where:{id}});
    if(!current)return res.status(404).json({message:"User not found"});
    const data={name:name.trim(),email:email.trim(),role};
    if(req.body.password) {
      if(typeof req.body.password!=="string"||req.body.password.length<8||Buffer.byteLength(req.body.password)>72)
        return res.status(400).json({message:"New passwords must contain at least 8 characters and at most 72 bytes"});
      data.password=await bcrypt.hash(req.body.password,10);
    }
    const user=await prisma.user.update({where:{id},data,select:{id:true,name:true,email:true,role:true,isActive:true}});
    res.json({message:"User updated",user});
  }catch(error){res.status(error.code==="P2002"?409:500).json({message:error.code==="P2002"?"Email already belongs to another user":"Unable to update user"});}
};

module.exports = {
  updateUser,
  createUser,
  getUsers,
  updateUserStatus,
  deleteUser
};