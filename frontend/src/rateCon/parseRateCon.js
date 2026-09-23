// Conservative label-based extraction. Missing/ambiguous fields remain blank for review.
const states = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|ON|QC|BC|AB|MB|SK|NB|NS|PE|NL|NT|NU|YT";
const cityPattern = new RegExp("([A-Za-z][A-Za-z .'-]{1,60}),? +(" + states + ")\\b(?: +[0-9]{5}(?:-[0-9]{4})?)?", "i");
export function parseDate(raw) {
  const iso = raw.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const us = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  const named = raw.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  let parts;
  if (iso) parts = [+iso[1], +iso[2], +iso[3]];
  else if (us) parts = [+us[3], +us[1], +us[2]];
  else if (named) parts = [+named[3], ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(named[1].slice(0, 3).toLowerCase()) + 1, +named[2]];
  if (!parts) return "";
  const [y, m, d] = parts; const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date.toISOString().slice(0, 10) : "";
}
const amount = value => {
  const cleaned = value.replace(/[$,\s]/g, "");
  return /^\d+(?:\.\d{1,2})?$/.test(cleaned) && +cleaned <= 1000000 ? +cleaned : null;
};
export function parseRateCon(raw) {
  const lines = raw.replace(/\r/g, "").split("\n").map(s => s.replace(/[\t ]+/g, " ").trim()).filter(Boolean);
  const candidates = {}; const warnings = [];
  function add(key, value, evidence) {
    if (value === "" || value == null) return;
    (candidates[key] ||= []).push({ value, evidence: evidence.slice(0, 300) });
  }
  let stop = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; const next = lines[i + 1] || "";
    if (/^(?:pick[ -]?up|shipper|origin|PU)\b/i.test(line)) stop = "pickup";
    else if (/^(?:delivery|deliver|drop[ -]?off|consignee|receiver|destination)\b/i.test(line)) stop = "dropoff";
    else if (/^(?:carrier|broker|payment|charges|rate information|terms|instructions|bill to|rate confirmation)\b/i.test(line)) stop = null;
    const load = line.match(/^(?:(?:load|shipment|trip|order|reference|ref|confirmation)\s*(?:number|no\.?|id|#)|load\s*#?)\s*[:#=-]\s*([A-Z0-9][A-Z0-9/-]{1,59})\b/i)
      || line.match(/^(?:load|shipment|trip|order|reference|ref|confirmation)\s*(?:number|no\.?|id|#)\s+([A-Z0-9][A-Z0-9/-]{1,59})\b/i);
    if (load) add("loadNumber", load[1], line);
    if (/^(?:load|shipment|order|reference)\s*(?:number|no\.?|id|#)\s*:?$/i.test(line) && /^[A-Z0-9][A-Z0-9/-]{1,59}$/i.test(next)) add("loadNumber", next, line + " " + next);
    const broker = line.match(/^broker(?:\s+(?:company|name))?\s*[:=-]\s*(.{2,150})$/i);
    if (broker) add("brokerNameCompany", broker[1], line);
    const miles = line.match(/^(?:(?:loaded|total|trip|estimated)\s+)?(?:miles|mileage|distance)\s*[:=-]?\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:mi(?:les)?|m)?$/i);
    if (miles) add("miles", amount(miles[1]), line);
    const rpm = line.match(/^(?:rate\s+per\s+mile|RPM|per\s+mile)\s*[:=-]?\s*\$?\s*([0-9]+(?:\.\d{1,2})?)\s*$/i);
    if (rpm) add("ratePerMile", amount(rpm[1]), line);
    // Do not treat line-haul, fuel surcharge, penalties, or a per-mile price as total pay.
    const totalLabel = /^(?:(?:total\s+)?carrier\s+(?:pay|rate|payment)|total\s+(?:carrier\s+)?(?:rate|pay|payment|amount|compensation|charges)|all[ -]?in\s+(?:rate|pay)|agreed\s+(?:rate|amount)|flat\s+rate|rate)\s*[:=$-]?\s*(?:USD\s*)?\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:USD)?$/i;
    const total = line.match(totalLabel);
    if (total) add("grossAmount", amount(total[1]), line);
    if (/^(?:total\s+(?:carrier\s+)?(?:rate|pay|payment|amount|compensation)|carrier\s+(?:rate|pay)|all[ -]?in\s+rate)\s*[:=-]?$/i.test(line)) {
      if (/^(?:USD\s*)?\$?\s*\d[\d,]*(?:\.\d{1,2})?\s*(?:USD)?$/i.test(next)) add("grossAmount", amount(next.replace(/USD/gi, "")), line + " " + next);
    }
    if (stop) {
      const content = line.replace(/^(?:pick[ -]?up|shipper|origin|PU|delivery|deliver|drop[ -]?off|consignee|receiver|destination)(?:\s+(?:location|address))?\s*[:#-]?\s*/i, "");
      const location = content.match(cityPattern);
      if (location) add(stop, location[1].trim() + ", " + location[2].toUpperCase(), line);
      if (!/^(?:signature|signed|printed|issue|expiration|invoice|payment|due)\b/i.test(line)) add(stop + "Date", parseDate(line), line);
      const time = line.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?(?:\s*-\s*(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?)?(?:\s*(?:EST|EDT|CST|CDT|MST|MDT|PST|PDT))?\b/i);
      if (time) add(stop === "pickup" ? "pickupTime" : "deliveryTime", time[0], line);
    }
  }
  const values = {}; const evidence = {};
  for (const [key, entries] of Object.entries(candidates)) {
    const unique = [...new Map(entries.map(e => [String(e.value).toLowerCase(), e])).values()];
    if (unique.length === 1) { values[key] = unique[0].value; evidence[key] = unique[0].evidence; }
    else warnings.push("More than one possible " + key + " was found. Please enter the correct value.");
  }
  if (values.pickupDate && values.dropoffDate && values.dropoffDate < values.pickupDate) {
    delete values.pickupDate; delete values.dropoffDate;
    warnings.push("The detected dates conflict. Please enter pickup and delivery dates.");
  }
  if (values.grossAmount !== undefined && values.miles > 0 && values.ratePerMile === undefined) {
    values.ratePerMile = Math.round(values.grossAmount / values.miles * 100) / 100;
    evidence.ratePerMile = "Calculated from detected total carrier rate divided by loaded miles.";
  }
  return { values, evidence, warnings };
}
