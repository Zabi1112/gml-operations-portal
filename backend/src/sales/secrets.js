
const {createHash,randomBytes,createCipheriv,createDecipheriv}=require("node:crypto");
function key(){const secret=process.env.SALES_ENCRYPTION_KEY || process.env.JWT_SECRET;if(!secret)throw new Error("Sales encryption is not configured");return createHash("sha256").update("ewl-sales-v1:"+secret).digest();}
function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString("base64")).join(".");}
function decrypt(value){const [iv,tag,data]=value.split(".").map(v=>Buffer.from(v,"base64"));const cipher=createDecipheriv("aes-256-gcm",key(),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString("utf8");}
module.exports={encrypt,decrypt};
