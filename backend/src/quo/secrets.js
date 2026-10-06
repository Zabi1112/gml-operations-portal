const {createHash,randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
function key(){const secret=process.env.QUO_ENCRYPTION_KEY||process.env.JWT_SECRET;if(!secret)throw new Error('Quo encryption is not configured');return createHash('sha256').update('ewl-quo-v1:'+secret).digest();}
function encrypt(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);return [iv,Buffer.concat([c.update(value,'utf8'),c.final()]),c.getAuthTag()].map(b=>b.toString('base64')).join('.');}
function decrypt(value){const [iv,bytes,tag]=value.split('.').map(v=>Buffer.from(v,'base64'));const c=createDecipheriv('aes-256-gcm',key(),iv);c.setAuthTag(tag);return Buffer.concat([c.update(bytes),c.final()]).toString('utf8');}
module.exports={encrypt,decrypt};
