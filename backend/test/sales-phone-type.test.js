const test=require('node:test');const assert=require('node:assert/strict');const {PhoneNumberUtil,PhoneNumberType}=require('google-libphonenumber');const {phoneTypeForExport}=require('../src/sales/phoneType');const util=PhoneNumberUtil.getInstance();
test('Google metadata classifies fixed lines, mobiles and ambiguous US numbers without guessing',()=>{
 for(const [region,type,label] of [['GB',PhoneNumberType.FIXED_LINE,'Landline'],['GB',PhoneNumberType.MOBILE,'Mobile'],['US',PhoneNumberType.FIXED_LINE_OR_MOBILE,'Landline or mobile'],['US',PhoneNumberType.TOLL_FREE,'Toll-free']]){
 const sample=util.getExampleNumberForType(region,type);assert.ok(sample);assert.equal(phoneTypeForExport('+'+sample.getCountryCode()+sample.getNationalNumber()),label);
 }
 assert.equal(phoneTypeForExport('(202) 555-0123'),'Landline or mobile');
});
test('missing, malformed and multiple numbers do not become mobile or landline',()=>{
 assert.equal(phoneTypeForExport(null),'Not provided');assert.equal(phoneTypeForExport('123'),'Invalid number');assert.equal(phoneTypeForExport('not a phone'),'Invalid number');assert.equal(phoneTypeForExport('202-555-0123 / 202-555-0199'),'Unknown');
});
