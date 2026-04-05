const { DataTypes } = require("sequelize");
const db = require("../config/database");

const CategoryModelOption = db.define(
  "CategoryModelOption",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_name: { type: DataTypes.STRING, allowNull: false },
    model_name: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "category_model_options",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["category_name", "model_name"],
      },
    ],
  }
);

module.exports = CategoryModelOption;
