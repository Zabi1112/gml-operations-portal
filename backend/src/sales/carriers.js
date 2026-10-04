
const states = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR VI GU AS MP".split(" "));
const text = (v, max = 1000) => typeof v === "string" ? v.trim().slice(0,max) : "";
const items = v => Array.isArray(v) ? v.filter(x=>typeof x==="string").map(x=>x.trim()) : typeof v==="string" ? v.split(/[,;|]/).map(x=>x.trim()).filter(Boolean) : [];
const count = v => v !== null && v !== "" && v !== undefined && Number.isSafeInteger(Number(v)) && Number(v)>=0 ? Number(v) : null;
function classifyCarrier(raw, mc) {
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("UNRECOGNIZED_RESPONSE");
 const legalName = text(raw.legal_name,250);
 // Some genuine snapshots have a null legal_name. Require carrier identifiers
 // before treating them as records, so API error objects are never skipped.
 const identifiedSnapshot = text(raw.entity_type) && /^\d+$/.test(String(raw.usdot ?? raw.usdot_number ?? "")) && (items(raw.mc_mx_ff_numbers).join(" ").match(/MC[-\s]*(\d+)/gi) || []).some(value=>Number(value.replace(/\D/g,""))===mc);
 if (!legalName && !identifiedSnapshot) throw new Error("UNRECOGNIZED_RESPONSE");
 const cargo = items(raw.cargo_carried);
 const operatingStatus = text(raw.operating_status).toUpperCase().replace(/\s+/g," ");
 const address = text(raw.physical_address);
 const sourceUrl = /^https?:\/\/safer\.fmcsa\.dot\.gov\//i.test(text(raw.url)) ? text(raw.url) : "";
 const email = text(raw.email || raw.email_address,254);
 const details = { mc, usdot:text(String(raw.usdot ?? raw.usdot_number ?? ""),30), name:legalName || "MC-"+mc+" - company name unavailable", dba:text(raw.dba_name,250),
  address, mailingAddress:text(raw.mailing_address), phone:text(raw.phone,80), email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:"",
  powerUnits:count(raw.power_units), drivers:count(raw.drivers), operatingStatus, cargo,
  classifications:items(raw.operation_classification), carrierOperation:items(raw.carrier_operation),
  safetyRating:text(raw.safety_rating,100), sourceUrl, sourceUpdatedAt:text(raw.latest_update,80), equipment:"Unknown - not supplied by snapshot" };
 const result = (outcome, reason) => ({ outcome, reason, details });
 if (/GARBAGE|REFUSE|\bTRASH\b|\bHAY\b|AGRICULT|FARM SUPPL|GRAIN|FEED|LIVESTOCK/i.test([...cargo,...details.classifications].join(" | "))) return result("EXCLUDED","Excluded garbage, hay or agricultural cargo");
 if (/NOT AUTHORIZED|INACTIVE|OUT OF SERVICE|REVOKED/.test(operatingStatus) || (raw.out_of_service_date && !/^(none|n\/a|not applicable)$/i.test(String(raw.out_of_service_date).trim()))) return result("EXCLUDED","Not authorized or out of service");
 if (!legalName) return result("REVIEW","Company legal name missing from provider snapshot");
 if (!/\bCARRIER\b/i.test(text(raw.entity_type))) return result(text(raw.entity_type)?"EXCLUDED":"REVIEW","Carrier entity not confirmed");
 if (!/^(AUTHORIZED FOR (PROPERTY|HIRE)|AUTHORIZED FOR PROPERTY(?:,? HHG)?|ACTIVE: AUTHORIZED FOR PROPERTY|AUTHORIZED FOR: MOTOR CARRIER OF PROPERTY \(EXCEPT HOUSEHOLD GOODS\))$/.test(operatingStatus)) return result("REVIEW","Property authority not confirmed");
 const mcValues = items(raw.mc_mx_ff_numbers).join(" ").match(/MC[-\s]*(\d+)/gi) || [];
 if (!mcValues.some(value=>Number(value.replace(/\D/g,""))===mc)) return result("REVIEW","Returned MC does not match requested MC");
 const explicitCountry = text(raw.physical_country || raw.country || raw.country_code).toUpperCase();
 if (explicitCountry && !["US","USA","UNITED STATES","UNITED STATES OF AMERICA"].includes(explicitCountry)) return result("EXCLUDED","Non-US carrier");
 const addressState = address.toUpperCase().match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?(?:\s+(?:USA|US|UNITED STATES))?\s*$/)?.[1];
 if (!addressState || !states.has(addressState)) return result("REVIEW","US physical address not confirmed");
 if (!details.usdot || !/^\d+$/.test(details.usdot)) return result("REVIEW","USDOT number missing");
 if (details.powerUnits === 0) return result("EXCLUDED","No reported power units");
 if (!cargo.length) return result("REVIEW","Cargo information missing");
 if (!cargo.some(c=>/GENERAL FREIGHT|REFRIGERATED FOOD|FRESH PRODUCE|MEAT|BEVERAGE|PAPER PRODUCT|BUILDING MATERIAL|METAL.*SHEET|MACHINERY|LARGE OBJECT|LUMBER|LOGS|COIL|CONSTRUCTION|DRY VAN|REEFER|FLATBED|STEP DECK|BOX TRUCK|HOT.?SHOT/i.test(c))) return result("EXCLUDED","No target freight category");
 return result("ACCEPTED","US authorized freight carrier");
}
function csvCell(value) {
 let s = value == null ? "" : String(value);
 if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
 return '"' + s.replace(/"/g,'""') + '"';
}
function leadsCsv(leads) {
 const headers=["MC","USDOT","Company","DBA","Physical address","Mailing address","Phone","Email","Reported power units","Drivers","Operating status","Cargo","Equipment","Safety rating","Source updated","Fetched at","Status","Contact count","Last contact","Follow-up date","Notes","Source"];
 const rows=leads.map(l=>{const d=l.details;return ["MC-"+l.mc,l.usdot,l.name,d.dba,l.address,d.mailingAddress,l.phone,l.email,d.powerUnits,d.drivers,d.operatingStatus,d.cargo.join("; "),d.equipment,d.safetyRating,d.sourceUpdatedAt,l.fetchedAt.toISOString(),l.status,l.contactCount,l.lastContactAt?.toISOString(),l.followUpDate,l.notes,d.sourceUrl];});
 return "\uFEFF"+[headers,...rows].map(r=>r.map(csvCell).join(",")).join("\r\n");
}
module.exports={classifyCarrier,leadsCsv,csvCell};
