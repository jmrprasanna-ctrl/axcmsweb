const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Technician = db.define(
  "Technician",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    technician_name: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    department: { type: DataTypes.STRING, allowNull: false },
    telephone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "technicians", timestamps: true }
);

module.exports = Technician;
