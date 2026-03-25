const { DataTypes } = require("sequelize");
const db = require("../config/database");

const SupportImportant = db.define(
  "SupportImportant",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    important_text: { type: DataTypes.STRING, allowNull: false },
    warranty_period: { type: DataTypes.STRING, allowNull: false, defaultValue: "3 month" },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "support_importants", timestamps: true }
);

module.exports = SupportImportant;
