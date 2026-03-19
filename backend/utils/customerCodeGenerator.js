const { Op } = require("sequelize");

function extractCustomerPrefix(name) {
  const words = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`;
  }

  const single = words[0] || "";
  if (!single) return "CU";
  if (single.length === 1) return `${single}X`;
  return `${single[0]}${single[1]}`;
}

function extractSuffixNumber(code, prefix) {
  const value = String(code || "").toUpperCase().trim();
  if (!value.startsWith(prefix)) return null;

  const suffix = value.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number(suffix);
}

async function generateNextCustomerCode({ customerName, CustomerModel, transaction, excludeCustomerPk = null }) {
  const prefix = extractCustomerPrefix(customerName);
  const where = {
    customer_id: {
      [Op.iLike]: `${prefix}%`,
    },
  };

  if (excludeCustomerPk) {
    where.id = { [Op.ne]: Number(excludeCustomerPk) };
  }

  const rows = await CustomerModel.findAll({
    attributes: ["customer_id"],
    where,
    transaction,
  });

  let maxSuffix = 0;
  for (const row of rows) {
    const parsed = extractSuffixNumber(row.customer_id, prefix);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  }

  const next = maxSuffix + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

module.exports = {
  extractCustomerPrefix,
  generateNextCustomerCode,
};
