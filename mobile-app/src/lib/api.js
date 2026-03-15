import Constants from "expo-constants";

function resolveApiBaseUrl() {
  const envUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    "";

  const host = String(hostUri).split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:5000/api`;
  }

  return "http://localhost:5000/api";
}

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, options = {}, token) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  login: (email, password) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }),
  dashboardSummary: (token, period = "day") => request(`/dashboard/summary?period=${encodeURIComponent(period)}`, {}, token),
  products: (token) => request("/products", {}, token),
  customers: (token) => request("/customers", {}, token),
  invoices: (token) => request("/invoices", {}, token),
};

export { API_BASE_URL };
