const {PhoneNumberUtil, PhoneNumberType} = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();
const labels = new Map([
  [PhoneNumberType.FIXED_LINE, 'Landline'],
  [PhoneNumberType.MOBILE, 'Mobile'],
  [PhoneNumberType.FIXED_LINE_OR_MOBILE, 'Landline or mobile'],
  [PhoneNumberType.VOIP, 'VoIP'],
  [PhoneNumberType.TOLL_FREE, 'Toll-free'],
  [PhoneNumberType.PREMIUM_RATE, 'Premium rate'],
  [PhoneNumberType.SHARED_COST, 'Shared cost'],
  [PhoneNumberType.PERSONAL_NUMBER, 'Personal number'],
  [PhoneNumberType.PAGER, 'Pager'],
  [PhoneNumberType.UAN, 'Universal access number'],
  [PhoneNumberType.VOICEMAIL, 'Voicemail']
]);
// Offline numbering-plan metadata, not a carrier lookup or SMS deliverability check.
// US geographic numbers commonly have an ambiguous fixed-line/mobile type.
function phoneTypeForExport(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Not provided';
  if (/[;,\r\n/]|\s(?:or|and)\s/i.test(raw)) return 'Unknown';
  try {
    const number = phoneUtil.parse(raw, 'US');
    if (!phoneUtil.isValidNumber(number)) return 'Invalid number';
    return labels.get(phoneUtil.getNumberType(number)) || 'Unknown';
  } catch {
    return 'Invalid number';
  }
}
module.exports = {phoneTypeForExport};
