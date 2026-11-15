const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateSlip}=require('../src/utils/salaryCalculation');
const {salaryData}=require('../src/utils/documentEdits');
const base={fixedSalaryPKR:40000,dispatchAmountUSD:2000,commissionPercent:10,usdRate:280,bonus:1000,loanDeduction:2000,advanceDeduction:3000,otherDeduction:500};
test('combined salary adds fixed pay and converted commission before bonus and deductions',()=>{
 assert.deepEqual(calculateSlip({...base,salaryType:'FIXED_COMMISSION'}),{employeeShareUSD:200,grossSalaryPKR:96000,netSalaryPKR:91500});
});
test('single salary types ignore the inactive component',()=>{
 assert.equal(calculateSlip({...base,salaryType:'FIXED'}).grossSalaryPKR,40000);
 assert.equal(calculateSlip({...base,salaryType:'COMMISSION'}).grossSalaryPKR,56000);
 assert.equal(calculateSlip({...base,salaryType:'FIXED_COMMISSION',dispatchAmountUSD:0}).grossSalaryPKR,40000);
});
test('saved combined salary corrections recalculate totals and reject supplied totals',()=>{
 const data=salaryData({...base,salaryType:'FIXED_COMMISSION',employeeId:1,employeeName:'Employee',periodStart:'2026-11-01',periodEnd:'2026-11-30',grossSalaryPKR:1,netSalaryPKR:1},calculateSlip);
 assert.equal(data.grossSalaryPKR,96000);assert.equal(data.netSalaryPKR,91500);
});
