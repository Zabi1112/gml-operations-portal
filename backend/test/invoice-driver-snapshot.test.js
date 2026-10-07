const test=require('node:test'),assert=require('node:assert/strict');
const {calculateInvoice}=require('../src/controllers/invoice.controller');
test('invoice calculation preserves per-load driver and truck snapshots with unchanged amounts',()=>{
 const result=calculateInvoice({billingType:'PERCENTAGE',dispatchPercent:10,loads:[{driverId:1,driverName:'Alex',truckId:7,truckNumber:'T7',date:'2026-10-07',pickup:'A',dropoff:'B',loadAmount:1000},{driverId:2,driverName:'Blake',date:'2026-10-07',pickup:'C',dropoff:'D',loadAmount:2000}]});
 assert.deepEqual(result.calculatedLoads.map(l=>l.driverName),['Alex','Blake']);assert.equal(result.calculatedLoads[0].truckId,7);assert.equal(result.totalLoadAmount,3000);assert.equal(result.totalDispatchAmount,300);
});
test('legacy invoice rows have nullable ownership instead of assigning the first selected driver',()=>{
 const result=calculateInvoice({selectedDriverIds:[1,2],driverNames:'Alex, Blake',loads:[{date:'2026-10-07',pickup:'A',dropoff:'B',loadAmount:100}]});
 assert.equal(result.calculatedLoads[0].driverId,null);assert.equal(result.calculatedLoads[0].driverName,null);
});
