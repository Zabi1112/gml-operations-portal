import test from 'node:test';
import assert from 'node:assert/strict';
import {groupInvoiceLoads} from '../src/invoices/groupLoads.js';
test('invoice groups three interleaved drivers without changing loads or totals',()=>{
 const loads=[{driverId:1,driverName:'Alex',loadAmount:100},{driverId:2,driverName:'Blake',loadAmount:200},{driverId:1,driverName:'Alex',loadAmount:300},{driverId:3,driverName:'Casey',loadAmount:400}];
 const before=JSON.stringify(loads),groups=groupInvoiceLoads(loads);
 assert.deepEqual(groups.map(g=>[g.name,g.loads.length]),[['Alex',2],['Blake',1],['Casey',1]]);
 assert.equal(groups.flatMap(g=>g.loads).reduce((sum,l)=>sum+l.loadAmount,0),1000);
 assert.equal(JSON.stringify(loads),before);
});
test('same-name drivers with different IDs remain separate and old loads are not assigned arbitrarily',()=>{
 const groups=groupInvoiceLoads([{driverId:1,driverName:'Alex'},{driverId:2,driverName:'Alex'},{driverName:'Historical driver'},{pickup:'Unknown load'}]);
 assert.equal(groups.length,4);assert.equal(groups[3].name,'Driver not recorded');assert.deepEqual(groupInvoiceLoads([]),[]);
});
