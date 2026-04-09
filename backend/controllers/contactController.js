const { Op, fn, col, where } = require("sequelize");
const Customer = require("../models/Customer");
const Lawyer = require("../models/Lawyer");

exports.getContacts = async (_req, res) => {
  try {
    const lawyers = await Lawyer.findAll({
      attributes: ["id", "name", "mobile", "email"],
      where: {
        email: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.ne]: "" },
          ],
        },
      },
      order: [["name", "ASC"], ["id", "DESC"]],
    });

    const customers = await Customer.findAll({
      attributes: ["id", "customer_id", "name", "mobile", "tel", "email"],
      where: {
        email: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.ne]: "" },
          ],
        },
      },
      order: [["name", "ASC"], ["id", "DESC"]],
    });

    res.json({
      lawyers: (Array.isArray(lawyers) ? lawyers : []).map((row) => ({
        id: row.id,
        name: String(row.name || "").trim(),
        mobile: String(row.mobile || "").trim(),
        email: String(row.email || "").trim(),
      })),
      clients: (Array.isArray(customers) ? customers : []).map((row) => ({
        id: row.id,
        customer_id: String(row.customer_id || "").trim(),
        name: String(row.name || "").trim(),
        mobile: String(row.mobile || row.tel || "").trim(),
        email: String(row.email || "").trim(),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load contacts." });
  }
};
