const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Expense = db.define("Expense",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    title:{ type: DataTypes.STRING(180), allowNull: false },
    customer:{ type: DataTypes.STRING(255), allowNull: true },
    client:{ type: DataTypes.STRING(255), allowNull: true },
    amount:{ type: DataTypes.FLOAT, allowNull: false },
    date:{ type: DataTypes.DATE, allowNull: false },
    category:{ type: DataTypes.STRING(80), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"expenses",timestamps:true});

module.exports = Expense;
