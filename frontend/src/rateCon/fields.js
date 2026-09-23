export const fields = [
  ["loadNumber", "Load / reference number", "text"],
  ["brokerNameCompany", "Broker company", "text"],
  ["pickup", "Pickup location", "text"],
  ["dropoff", "Delivery location", "text"],
  ["pickupDate", "Pickup date", "date"],
  ["dropoffDate", "Delivery date", "date"],
  ["pickupTime", "Pickup time / appointment", "text"],
  ["deliveryTime", "Delivery time / appointment", "text"],
  ["miles", "Loaded miles", "number"],
  ["grossAmount", "Total carrier rate ($)", "number"],
  ["ratePerMile", "Rate per mile ($)", "number"],
];
export const contexts = {
  paycheck: ["pickupDate", "dropoffDate", "pickup", "dropoff", "loadNumber", "miles", "grossAmount"],
  invoice: ["pickupDate", "pickup", "dropoff", "grossAmount"],
  daily: fields.map(([key]) => key),
  report: ["pickupDate", "dropoffDate", "pickup", "dropoff", "miles", "grossAmount", "ratePerMile"],
};
export function mapRateCon(values, context) {
  const mapping = context === "paycheck"
    ? { pickupDate: "pickupDate", dropoffDate: "deliveryDate", pickup: "origin", dropoff: "destination", loadNumber: "reference", miles: "miles", grossAmount: "gross" }
    : context === "invoice" ? { pickupDate: "date", pickup: "pickup", dropoff: "dropoff", grossAmount: "loadAmount" }
      : Object.fromEntries(contexts[context].map(key => [key, key]));
  return Object.fromEntries(Object.entries(mapping).filter(([from]) => values[from] !== "" && values[from] !== undefined && values[from] !== null).map(([from, to]) => [to, values[from]]));
}
