const { DataTypes } = require("sequelize");
const db = require("../config/database");
const RentalMachine = require("./RentalMachine");
const Customer = require("./Customer");

const RentalMachineCount = db.define(
  "RentalMachineCount",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transaction_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    rental_machine_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: RentalMachine, key: "id" },
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Customer, key: "id" },
    },
    input_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updated_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "rental_machine_counts", timestamps: true }
);

RentalMachineCount.belongsTo(RentalMachine, { foreignKey: "rental_machine_id" });
RentalMachineCount.belongsTo(Customer, { foreignKey: "customer_id" });

module.exports = RentalMachineCount;
