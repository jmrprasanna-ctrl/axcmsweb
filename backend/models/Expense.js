const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Expense = db.define("Expense",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    title:{ type: DataTypes.STRING },
    customer:{ type: DataTypes.STRING },
    amount:{ type: DataTypes.FLOAT },
    date:{ type: DataTypes.DATE },
    category:{ type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"expenses",timestamps:true});

module.exports = Expense;
