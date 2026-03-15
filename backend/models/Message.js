const { DataTypes } = require("sequelize");
const db = require("../config/database");

const Message = db.define("Message",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    from_user_id:{ type: DataTypes.INTEGER, allowNull:true },
    to_user_id:{ type: DataTypes.INTEGER, allowNull:true },
    title:{ type: DataTypes.STRING, allowNull:false },
    body:{ type: DataTypes.TEXT, allowNull:false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"messages",timestamps:true});

module.exports = Message;
