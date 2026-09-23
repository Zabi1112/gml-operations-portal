export const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"); };
export const defaultDeductions = type => (type === "OWNER_OPERATOR" ? [
  ["IFTA", 75, "WEEKLY"], ["Office fee", 65, "WEEKLY"], ["Insurance", 750, "WEEKLY"], ["ELD", 40, "WEEKLY"], ["Fuel charges", 0, "ONCE"],
] : [["Fuel charges", 0, "ONCE"], ["Cash / fuel advances", 0, "ONCE"]]).map(([description, rate, frequency]) => ({ description, rate, frequency }));
export const emptyLoad = () => ({ pickupDate: today(), deliveryDate: today(), origin: "", destination: "", reference: "", miles: 0, gross: 0 });
export const emptyStatement = () => ({ companyId: "", driverId: "", truckId: "", companyName: "", mcNumber: "", dotNumber: "", companyAddress: "", companyPhone: "", companyLogo: "", recipientType: "DRIVER", recipientName: "", recipientPhone: "", truckNumber: "", trailerNumber: "", periodStart: today(), periodEnd: today(), percent: 30, weeks: 1, deductions: defaultDeductions("DRIVER"), additions: [], loads: [emptyLoad()], notes: "" });

export async function readCompanyLogo(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5000000) throw new Error("Choose a PNG, JPEG or WebP logo under 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    for (const size of [240, 160, 100]) {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(size / bitmap.width, size / bitmap.height, 1);
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if (data.length <= 50000) return data;
    }
    throw new Error("This logo is too detailed. Choose a smaller image.");
  } finally { bitmap.close(); }
}
