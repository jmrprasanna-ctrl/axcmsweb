const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Condition = db.define("Condition",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    condition:{ type: DataTypes.STRING, allowNull:false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"conditions",timestamps:true});

module.exports = Condition;
