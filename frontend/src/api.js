const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const API = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
