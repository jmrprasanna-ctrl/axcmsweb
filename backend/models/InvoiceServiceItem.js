const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Invoice = require("./Invoice");

const InvoiceServiceItem = db.define("InvoiceServiceItem", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Invoice, key: "id" } },
    description: { type: DataTypes.STRING(120), allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, { tableName: "invoice_service_items", timestamps: true });

InvoiceServiceItem.belongsTo(Invoice, { foreignKey: "invoice_id" });
Invoice.hasMany(InvoiceServiceItem, { foreignKey: "invoice_id" });

module.exports = InvoiceServiceItem;
