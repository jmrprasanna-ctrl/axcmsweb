const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Invoice = require("./Invoice");
const Product = require("./Product");

const InvoiceItem = db.define("InvoiceItem",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    invoice_id:{ type: DataTypes.INTEGER, references:{ model:Invoice,key:"id" } },
    product_id:{ type: DataTypes.INTEGER, references:{ model:Product,key:"id" } },
    qty:{ type: DataTypes.INTEGER, defaultValue:1 },
    rate:{ type: DataTypes.FLOAT },
    vat:{ type: DataTypes.FLOAT, defaultValue:0 },
    gross:{ type: DataTypes.FLOAT, defaultValue:0 },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"invoice_items",timestamps:true});

InvoiceItem.belongsTo(Invoice,{foreignKey:"invoice_id"});
InvoiceItem.belongsTo(Product,{foreignKey:"product_id"});
Invoice.hasMany(InvoiceItem,{foreignKey:"invoice_id"});

module.exports = InvoiceItem;
