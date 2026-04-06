const { fn, col, where } = require("sequelize");
const Lawyer = require("../models/Lawyer");
const Court = require("../models/Court");

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

async function listRows(model, res, label) {
  try {
    const rows = await model.findAll({ order: [["name", "ASC"], ["id", "DESC"]] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || `Failed to load ${label}.` });
  }
}

async function addRow(model, req, res, label) {
  try {
    const name = normalizeName(req.body?.name);
    const address = normalizeText(req.body?.address);
    const area = normalizeText(req.body?.area);
    const mobile = label === "Lawyer" ? normalizeText(req.body?.mobile) : "";
    if (!name) {
      return res.status(400).json({ message: `${label} name is required.` });
    }

    const exists = await model.findOne({
      where: where(fn("LOWER", col("name")), name.toLowerCase()),
    });
    if (exists) {
      return res.status(400).json({ message: `${label} already exists.` });
    }

    const created = await model.create({
      name,
      address: address || null,
      area: area || null,
      ...(label === "Lawyer" ? { mobile: mobile || null } : {})
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message || `Failed to add ${label}.` });
  }
}

async function deleteRow(model, req, res, label) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: `Invalid ${label} id.` });
    }
    const row = await model.findByPk(id);
    if (!row) {
      return res.status(404).json({ message: `${label} not found.` });
    }
    await row.destroy();
    res.json({ message: `${label} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message || `Failed to delete ${label}.` });
  }
}

exports.getLawyers = async (_req, res) => listRows(Lawyer, res, "lawyers");
exports.addLawyer = async (req, res) => addRow(Lawyer, req, res, "Lawyer");
exports.deleteLawyer = async (req, res) => deleteRow(Lawyer, req, res, "Lawyer");

exports.getCourts = async (_req, res) => listRows(Court, res, "courts");
exports.addCourt = async (req, res) => addRow(Court, req, res, "Court");
exports.deleteCourt = async (req, res) => deleteRow(Court, req, res, "Court");
