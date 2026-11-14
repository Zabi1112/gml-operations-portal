import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentFeePreview, receivedInvoiceFeeUSD} from '../src/finance/invoiceAccountsFees.js';
const invoice={outstandingAmountUSD:500,accountsFeePendingUSD:260};
test('full clearance includes all fees without a manual amount',()=>{
 assert.deepEqual(paymentFeePreview(invoice,{amountReceivedUSD:500}),{full:true,pendingUSD:260,feeUSD:260,error:''});
});
test('partial payment requires a choice and validates the fee portion',()=>{
 assert.match(paymentFeePreview(invoice,{amountReceivedUSD:100}).error,/Choose/);
 assert.equal(paymentFeePreview(invoice,{amountReceivedUSD:100,includesAccountsFee:'no'}).feeUSD,0);
 assert.equal(paymentFeePreview(invoice,{amountReceivedUSD:200,includesAccountsFee:'yes',accountsFeeReceivedUSD:100}).error,'');
 assert.match(paymentFeePreview(invoice,{amountReceivedUSD:100,includesAccountsFee:'yes',accountsFeeReceivedUSD:101}).error,/exceed/);
 assert.match(paymentFeePreview(invoice,{amountReceivedUSD:300,includesAccountsFee:'no'}).error,/non-accounts/);
});
test('receipt displays sum recorded fee portions; old records contribute zero',()=>{
 assert.equal(receivedInvoiceFeeUSD({paymentAllocations:[{amountUSD:200},{accountsFeeUSD:50.01},{accountsFeeUSD:49.99}]}),100);
 assert.equal(receivedInvoiceFeeUSD({accountsAmountPKR:1000}),0);
});
