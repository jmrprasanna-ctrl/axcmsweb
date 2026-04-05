const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Lawyer = db.define(
  "Lawyer",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "lawyers", timestamps: true }
);

module.exports = Lawyer;
