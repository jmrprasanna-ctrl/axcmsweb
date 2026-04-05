const { DataTypes } = require("sequelize");
const db = require("../config/database");
const RentalMachine = require("./RentalMachine");
const Product = require("./Product");
const Customer = require("./Customer");

const RentalMachineConsumable = db.define(
  "RentalMachineConsumable",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rental_machine_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: RentalMachine, key: "id" },
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Customer, key: "id" },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Product, key: "id" },
    },
    save_batch_id: { type: DataTypes.STRING, allowNull: true },
    consumable_name: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    entry_date: { type: DataTypes.DATEONLY, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  { tableName: "rental_machine_consumables", timestamps: true }
);

RentalMachineConsumable.belongsTo(RentalMachine, { foreignKey: "rental_machine_id" });
RentalMachineConsumable.belongsTo(Customer, { foreignKey: "customer_id" });
RentalMachineConsumable.belongsTo(Product, { foreignKey: "product_id" });

module.exports = RentalMachineConsumable;
