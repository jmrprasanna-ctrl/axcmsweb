const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Todo = db.define("Todo", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  done: { type: DataTypes.BOOLEAN, defaultValue: false },
  todo_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  done_by: { type: DataTypes.INTEGER, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, { tableName: "todos", timestamps: true });

module.exports = Todo;
