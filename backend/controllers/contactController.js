const { Op, fn, col, where } = require("sequelize");
const Customer = require("../models/Customer");
const Lawyer = require("../models/Lawyer");

exports.getContacts = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const type = String(req.query.type || "all").trim().toLowerCase();
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

    const lawyerRows = (Array.isArray(lawyers) ? lawyers : []).map((row) => ({
        id: row.id,
        contact_type: "lawyer",
        customer_id: "",
        name: String(row.name || "").trim(),
        mobile: String(row.mobile || "").trim(),
        email: String(row.email || "").trim(),
      }));
    const clientRows = (Array.isArray(customers) ? customers : []).map((row) => ({
        id: row.id,
        contact_type: "client",
        customer_id: String(row.customer_id || "").trim(),
        name: String(row.name || "").trim(),
        mobile: String(row.mobile || row.tel || "").trim(),
        email: String(row.email || "").trim(),
      }));

    const contacts = [...lawyerRows, ...clientRows]
      .filter((row) => {
        if (type !== "all" && row.contact_type !== type) return false;
        if (!q) return true;
        const hay = [
          row.contact_type,
          row.customer_id,
          row.name,
          row.mobile,
          row.email,
        ].map((x) => String(x || "").toLowerCase()).join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    res.json({
      lawyers: lawyerRows,
      clients: clientRows,
      contacts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load contacts." });
  }
};
