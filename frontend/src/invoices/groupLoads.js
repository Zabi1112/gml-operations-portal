export function groupInvoiceLoads(loads = []) {
 const groups = new Map();
 for (const load of loads) {
  const name = String(load.driverName || '').trim();
  const key = load.driverId ? 'id:' + load.driverId : name ? 'name:' + name : 'unassigned';
  if (!groups.has(key)) groups.set(key, {key, name: name || 'Driver not recorded', loads: []});
  groups.get(key).loads.push(load);
 }
 return [...groups.values()];
}

// The driver selected for a load takes precedence over older combined-name snapshots.
export function invoiceDriverName(load, drivers = []) {
 const assigned = load.driverId && drivers.find(driver => Number(driver.id) === Number(load.driverId));
 return assigned?.name || load.driverName || '';
}
