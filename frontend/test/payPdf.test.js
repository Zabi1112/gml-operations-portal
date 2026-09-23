import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createPayPdf } from "../src/paychecks/payPdf.js";
const require = createRequire(import.meta.url);
const { calculateStatement } = require("../../backend/src/utils/payStatements.js");
function body() { return { companyName:"ABC TRANSPORT LLC",mcNumber:"123456",recipientName:"Test Operator",recipientType:"OWNER_OPERATOR",percent:10,weeks:1,periodStart:"2026-09-01",periodEnd:"2026-09-07",loads:[{pickupDate:"2026-09-01",deliveryDate:"2026-09-03",origin:"PA",destination:"CA",miles:2500,gross:8900}],deductions:[{description:"Fuel",rate:1200,frequency:"ONCE"},{description:"Weekly costs",rate:930,frequency:"WEEKLY"}],additions:[] }; }
test("PDF uses the client identity and server-calculated amounts",()=>{
  const pdf = createPayPdf(calculateStatement(body()), {id:42,revision:2});
  const text = pdf.output();
  assert.match(text,/ABC TRANSPORT LLC/); assert.match(text,/5,880.00/); assert.match(text,/PS-42/); assert.match(text,/Revision 2/);
  assert.doesNotMatch(text,/EastWest|EAST WEST|GML/);
  assert.equal(pdf.getNumberOfPages(),1);
});
test("long statements paginate and retain final totals and notes",()=>{
  const input = body();input.loads=Array.from({length:100},(_,i)=>({...input.loads[0],reference:"LOAD-"+i,gross:89}));input.notes="Final note after all loads";
  const pdf=createPayPdf(calculateStatement(input));const text=pdf.output();
  assert.ok(pdf.getNumberOfPages()>3);assert.match(text,/LOAD-99/);assert.match(text,/Final note after all loads/);assert.match(text,/5,880.00/);assert.match(text,/DRAFT PREVIEW/);
});
