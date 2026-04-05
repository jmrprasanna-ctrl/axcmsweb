const { Op } = require("sequelize");
const Todo = require("../models/Todo");
const User = require("../models/User");

async function attachDoneByNames(rows) {
  const todos = Array.isArray(rows) ? rows : [];
  const ids = [...new Set(todos.map((t) => Number(t.done_by)).filter((v) => Number.isFinite(v) && v > 0))];
  if (!ids.length) {
    return todos.map((t) => ({ ...t.toJSON(), done_by_name: null }));
  }
  const users = await User.findAll({ where: { id: ids }, attributes: ["id", "username", "email"] });
  const map = new Map(users.map((u) => [Number(u.id), u.username || u.email || `User ${u.id}`]));
  return todos.map((t) => {
    const row = t.toJSON();
    return { ...row, done_by_name: map.get(Number(row.done_by)) || null };
  });
}

exports.getTodos = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const where = {};
    const start = String(req.query?.start || "").trim();
    const end = String(req.query?.end || "").trim();
    const date = String(req.query?.date || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      where.todo_date = date;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      where.todo_date = { [Op.between]: [start, end] };
    }

    if (role === "user") {
      where[Op.or] = [{ assigned_to: req.user.id }, { created_by: req.user.id }];
    }

    const rows = await Todo.findAll({ where, order: [["todo_date", "ASC"], ["createdAt", "ASC"]] });
    const enriched = await attachDoneByNames(rows);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load todos." });
  }
};

exports.createTodo = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const title = String(req.body?.title || "").trim();
    const todoDate = String(req.body?.todo_date || "").trim();
    if (!title) return res.status(400).json({ message: "Title is required." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todoDate)) return res.status(400).json({ message: "Valid todo date is required." });

    let assignedTo = req.body?.assigned_to ? Number(req.body.assigned_to) : null;
    if (!Number.isFinite(assignedTo) || assignedTo <= 0) assignedTo = null;
    if (role === "user") {
      assignedTo = req.user?.id || null;
    } else if (!assignedTo) {
      assignedTo = req.user?.id || null;
    }

    const row = await Todo.create({
      title,
      todo_date: todoDate,
      created_by: req.user?.id || null,
      assigned_to: assignedTo,
    });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create todo." });
  }
};

exports.updateTodo = async (req, res) => {
  try {
    const id = Number(req.params?.id);
    const row = await Todo.findByPk(id);
    if (!row) return res.status(404).json({ message: "Todo not found." });

    const role = String(req.user?.role || "").toLowerCase();
    if (role === "user") {
      const assigned = Number(row.assigned_to) === Number(req.user?.id);
      const created = Number(row.created_by) === Number(req.user?.id);
      if (!assigned && !created) return res.status(403).json({ message: "Forbidden." });
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "title")) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ message: "Title is required." });
      row.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "todo_date")) {
      const todoDate = String(req.body.todo_date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(todoDate)) return res.status(400).json({ message: "Valid todo date is required." });
      row.todo_date = todoDate;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "done")) {
      row.done = Boolean(req.body.done);
      row.done_by = row.done ? (req.user?.id || null) : null;
    }

    await row.save();
    const enriched = await attachDoneByNames([row]);
    res.json(enriched[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update todo." });
  }
};

exports.deleteTodo = async (req, res) => {
  try {
    const id = Number(req.params?.id);
    const role = String(req.user?.role || "").toLowerCase();
    if (role !== "admin" && role !== "manager") {
      return res.status(403).json({ message: "Forbidden." });
    }
    await Todo.destroy({ where: { id } });
    res.json({ message: "Todo deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete todo." });
  }
};
