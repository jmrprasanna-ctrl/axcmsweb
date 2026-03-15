const { DataTypes } = require("sequelize");
const db = require("../config/database");

const UiSetting = db.define(
  "UiSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    app_name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "PULMO TECHNOLOGIES" },
    footer_text: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "\u00A9 All Right Recieved with CRONIT SOLLUTIONS - JMR Prasanna.",
    },
    primary_color: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "#0f6abf" },
    accent_color: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "#11a36f" },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "ui_settings", timestamps: true }
);

module.exports = UiSetting;

