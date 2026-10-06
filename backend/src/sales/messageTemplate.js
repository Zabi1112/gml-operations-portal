const states = Object.fromEntries('AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|PR:Puerto Rico|VI:Virgin Islands|GU:Guam|AS:American Samoa|MP:Northern Mariana Islands'.split('|').map(s=>s.split(':')));
const tokens=['company_name','mc_number','state_name','state_code','address','phone','email','usdot_number','truck_count'];
function validateTemplate(value){
 if(typeof value!=='string'||!value.trim()||value.length>1600)throw Object.assign(new Error('Enter a message of 1 to 1,600 characters.'),{status:400});
 const clean=value.trim().replace(/{{\s*([a-z_]+)\s*}}/g,(match,key)=>tokens.includes(key)?'':match);
 if(/[{}]/.test(clean))throw Object.assign(new Error('Unknown message field. Use the provided personalization buttons.'),{status:400});
 return value.trim();
}
function renderMessage(lead,template){
 const address=String(lead.address||'').trim();
 const stateCode=address.toUpperCase().match(/\b([A-Z]{2})[ ,]+\d{5}(?:-\d{4})?(?:[ ,]+(?:USA|US|UNITED STATES(?: OF AMERICA)?))?\s*$/)?.[1];
 const values={company_name:lead.name,mc_number:lead.mc,state_name:states[stateCode],state_code:states[stateCode]?stateCode:null,address,phone:lead.phone,email:lead.email,usdot_number:lead.usdot,truck_count:lead.details?.powerUnits};
 const missing=[];
 const text=template.replace(/{{\s*([a-z_]+)\s*}}/g,(_,key)=>{const value=values[key];if(value==null||String(value).trim()===''){missing.push(key);return '';}return String(value);});
 return {text,missing:[...new Set(missing)]};
}
module.exports={validateTemplate,renderMessage};
