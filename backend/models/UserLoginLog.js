const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./User");

const UserLoginLog = db.define("UserLoginLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: "id" }
  },
  username: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  login_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  ip_address: { type: DataTypes.STRING, allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, {
  tableName: "user_login_logs",
  timestamps: true
});

UserLoginLog.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(UserLoginLog, { foreignKey: "user_id" });

module.exports = UserLoginLog;
