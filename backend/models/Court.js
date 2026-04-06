const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Court = db.define(
  "Court",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    area: { type: DataTypes.STRING(150), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "courts", timestamps: true }
);

module.exports = Court;
