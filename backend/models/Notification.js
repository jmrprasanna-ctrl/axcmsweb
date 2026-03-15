const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Notification = db.define("Notification",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    title:{ type: DataTypes.STRING, allowNull:false },
    body:{ type: DataTypes.TEXT, allowNull:false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"notifications",timestamps:true});

module.exports = Notification;
