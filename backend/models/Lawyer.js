const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Lawyer = db.define(
  "Lawyer",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    area: { type: DataTypes.STRING(150), allowNull: true },
    mobile: { type: DataTypes.STRING(60), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "lawyers", timestamps: true }
);

module.exports = Lawyer;
