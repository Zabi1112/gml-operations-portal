const {classifyCarrier}=require('./carriers');
function providerError(message,options={}){const error=new Error(message);error.publicMessage=message;Object.assign(error,options);return error;}
async function readBody(response){
 if(!response.body)throw providerError('Provider returned an empty response; this MC has not been skipped.',{retryable:true});
 const reader=response.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();throw providerError('Provider response exceeded the size limit; this MC has not been skipped.');}chunks.push(Buffer.from(value));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw providerError('Provider returned an unreadable response; this MC has not been skipped.',{retryable:true});}
}
// SaferWebAPI uses HTTP 400 for both inactive carriers and missing MCs.
// Only recognize the confirmed record-specific messages, never every HTTP 400.
function recordOutcome(status,body,mc){
 if(status!==400||typeof body?.message!=='string')return null;
 const message=body.message.trim();
 const inactive=message.match(/^The MC\/MX number (\d+) is marked INACTIVE in the SAFER database\.$/i);
 if(inactive&&Number(inactive[1])===mc)return {outcome:'EXCLUDED',reason:'Inactive MC in SAFER database'};
 const missing=message.match(/^The MC or MX number (\d+) was not found\.$/i);
 if(missing&&Number(missing[1])===mc)return {outcome:'MISSING',reason:'MC not found'};
 return null;
}
async function decodeSnapshot(response,mc){
 if(response.status===404)return {outcome:'MISSING',reason:'MC not found'};
 if(!response.ok&&response.status!==400)throw providerError('Provider returned HTTP '+response.status+'; this MC has not been skipped.',{retryable:response.status>=500||response.status===408});
 const body=await readBody(response),outcome=recordOutcome(response.status,body,mc);
 if(outcome)return outcome;
 if(response.status===400&&typeof body?.message==='string'&&/^list index out of range[.!]?$/i.test(body.message.trim()))throw providerError('Provider could not parse this carrier snapshot.',{quarantine:true});
 if(!response.ok)throw providerError('Provider rejected the lookup (HTTP '+response.status+'); this MC has not been skipped.');
 try{return classifyCarrier(body,mc);}catch{throw providerError('Unrecognized carrier response; this MC has not been skipped.');}
}
module.exports={decodeSnapshot,recordOutcome};
