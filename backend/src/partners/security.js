const crypto = require('node:crypto');
class PartnerError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (message, status = 400) => { throw new PartnerError(status, message); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function key() {
 const secret = process.env.PARTNER_AGREEMENT_KEY || process.env.JWT_SECRET;
 if (!secret || secret.length < 24) throw new Error('Partner identity encryption unavailable');
 return crypto.createHash('sha256').update('ewl-partner-identities-v1:' + secret).digest();
}
function encrypt(value, context) {
 const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
 cipher.setAAD(Buffer.from(context));
 const ciphertext = Buffer.concat([cipher.update(Buffer.from(value)), cipher.final()]);
 return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}
function decrypt(value, context) {
 const bytes = Buffer.from(value, 'base64'), cipher = crypto.createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
 cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(bytes.subarray(12, 28));
 return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
const MAX_FILE = 2 * 1024 * 1024;
function passport(body) {
 const documentType = body.documentType ?? 'PASSPORT';
 if (!['PASSPORT','DRIVING_LICENSE'].includes(documentType)) fail('Choose passport or driving licence.');
 const number = String(body.passportNumber || '').trim().toUpperCase();
 const country = String(body.passportCountry || '').trim();
 if (!/^[A-Z0-9 -]{6,30}$/.test(number)) fail('Enter a valid passport number (4–30 letters or numbers).');
 if (country.length < 2 || country.length > 80 || /[\r\n\x00-\x1f]/.test(country)) fail('Enter the document issuing country / state.');
 const file = body.passportFile;
 if (!file || typeof file.base64 !== 'string' || file.base64.length > Math.ceil(MAX_FILE / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.base64)) fail('Upload a PNG, JPEG, or PDF identity document scan, up to 2 MB.');
 const bytes = Buffer.from(file.base64, 'base64');
 const valid = file.mime === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' : file.mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : file.mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
 if (!valid || bytes.length < 32 || bytes.length > MAX_FILE || bytes.toString('base64') !== file.base64) fail('The identity document file must be a valid PNG, JPEG, or PDF, up to 2 MB.');
 return { documentType, number, country, bytes, mime: file.mime, digest: hash(bytes) };
}
module.exports = { PartnerError, fail, hash, encrypt, decrypt, passport, MAX_FILE };
