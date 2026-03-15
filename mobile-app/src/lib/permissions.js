const USER_FEATURES = new Set([
  "dashboard",
  "products",
  "machines",
  "general_machines",
  "customers",
  "vendors",
  "expenses",
  "messages",
  "notifications",
  "invoices",
  "sales_report",
  "more",
]);

const MANAGER_BLOCKED = new Set([
  "users",
]);

function normalizeRole(role) {
  return String(role || "user").trim().toLowerCase();
}

export function canAccessFeature(role, featureKey) {
  const r = normalizeRole(role);
  const key = String(featureKey || "").trim().toLowerCase();

  if (r === "admin") return true;
  if (r === "manager") return !MANAGER_BLOCKED.has(key);
  if (r === "user") return USER_FEATURES.has(key);
  return false;
}

export function getRoleFeatureList(role) {
  const allFeatures = [
    "dashboard",
    "products",
    "machines",
    "general_machines",
    "customers",
    "vendors",
    "expenses",
    "messages",
    "notifications",
    "invoices",
    "sales_report",
    "finance",
    "support",
    "stock",
    "users",
    "more",
  ];

  return allFeatures.filter((feature) => canAccessFeature(role, feature));
}
