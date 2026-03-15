const { DataTypes } = require("sequelize");
const db = require("../config/database");

const User = db.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING },
    department: { type: DataTypes.STRING },
    telephone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    // Use STRING to avoid ENUM migration issues on existing databases.
    role: { type: DataTypes.STRING, defaultValue: "user" },
    password: { type: DataTypes.STRING, allowNull: false },
    // Allow existing rows to survive schema evolution when adding timestamps.
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"users",timestamps:true});

module.exports = User;
