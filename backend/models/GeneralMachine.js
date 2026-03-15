const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Customer = require("./Customer");

const GeneralMachine = db.define(
  "GeneralMachine",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    machine_id: { type: DataTypes.STRING, allowNull: true, unique: true },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Customer, key: "id" },
    },
    customer_name: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING },
    model: { type: DataTypes.STRING, allowNull: true },
    machine_title: { type: DataTypes.STRING, allowNull: true },
    serial_no: { type: DataTypes.STRING },
    start_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "general_machines", timestamps: true }
);

GeneralMachine.belongsTo(Customer, { foreignKey: "customer_id" });

module.exports = GeneralMachine;

